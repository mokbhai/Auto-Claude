"""
PTY Manager for Terminal Emulation
===================================

Manages pseudo-terminal sessions using Python's pty module.
Provides WebSocket-based terminal I/O for the web interface.
"""

import asyncio
import os
import pty
import select
import struct
import termios
import fcntl
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .event_bus import EventBus, EventType


@dataclass
class TerminalSession:
    """Represents an active terminal session."""

    id: str
    master_fd: int
    pid: int
    cols: int = 80
    rows: int = 24
    cwd: str = ""
    env: dict[str, str] = field(default_factory=dict)
    title: str = "Terminal"
    shell: str = "/bin/bash"

    # Optional worktree association
    worktree_path: str | None = None
    worktree_branch: str | None = None


class PTYManager:
    """
    Manages PTY sessions for terminal emulation.

    Replaces node-pty with Python's built-in pty module.
    """

    def __init__(self, event_bus: EventBus) -> None:
        self._event_bus = event_bus
        self._sessions: dict[str, TerminalSession] = {}
        self._read_tasks: dict[str, asyncio.Task] = {}
        self._id_counter = 0

    def _generate_id(self) -> str:
        """Generate a unique terminal ID."""
        self._id_counter += 1
        return f"term-{self._id_counter}"

    async def create_terminal(
        self,
        cwd: str | None = None,
        cols: int = 80,
        rows: int = 24,
        env: dict[str, str] | None = None,
        shell: str | None = None,
    ) -> TerminalSession:
        """
        Create a new PTY terminal session.

        Args:
            cwd: Working directory for the terminal.
            cols: Initial column count.
            rows: Initial row count.
            env: Environment variables.
            shell: Shell to use (defaults to $SHELL or /bin/bash).

        Returns:
            The created terminal session.
        """
        terminal_id = self._generate_id()

        # Determine shell
        if shell is None:
            shell = os.environ.get("SHELL", "/bin/bash")

        # Set up environment
        terminal_env = os.environ.copy()
        if env:
            terminal_env.update(env)

        # Set TERM for proper terminal emulation
        terminal_env["TERM"] = "xterm-256color"

        # Fork a new PTY
        pid, master_fd = pty.fork()

        if pid == 0:
            # Child process - exec the shell
            os.chdir(cwd or os.getcwd())
            os.execve(shell, [shell], terminal_env)
        else:
            # Parent process - create session
            session = TerminalSession(
                id=terminal_id,
                master_fd=master_fd,
                pid=pid,
                cols=cols,
                rows=rows,
                cwd=cwd or os.getcwd(),
                env=terminal_env,
                shell=shell,
            )

            self._sessions[terminal_id] = session

            # Set terminal size
            self._set_size(master_fd, cols, rows)

            # Start reading output in background
            self._read_tasks[terminal_id] = asyncio.create_task(
                self._read_output(session)
            )

            return session

    async def destroy_terminal(self, terminal_id: str) -> bool:
        """
        Destroy a terminal session.

        Args:
            terminal_id: ID of the terminal to destroy.

        Returns:
            True if terminal was destroyed, False if not found.
        """
        session = self._sessions.get(terminal_id)
        if not session:
            return False

        # Cancel read task
        if terminal_id in self._read_tasks:
            self._read_tasks[terminal_id].cancel()
            del self._read_tasks[terminal_id]

        # Close master fd
        try:
            os.close(session.master_fd)
        except OSError:
            pass

        # Kill the process
        try:
            os.kill(session.pid, 9)
        except ProcessLookupError:
            pass

        del self._sessions[terminal_id]

        # Emit exit event
        await self._event_bus.emit(
            EventType.TERMINAL_EXIT,
            {"exitCode": 0},
            terminal_id=terminal_id,
        )

        return True

    async def write_input(self, terminal_id: str, data: str) -> bool:
        """
        Write input to a terminal.

        Args:
            terminal_id: ID of the terminal.
            data: Input data to write.

        Returns:
            True if successful, False if terminal not found.
        """
        session = self._sessions.get(terminal_id)
        if not session:
            return False

        try:
            os.write(session.master_fd, data.encode("utf-8"))
            return True
        except OSError:
            return False

    async def resize_terminal(self, terminal_id: str, cols: int, rows: int) -> bool:
        """
        Resize a terminal.

        Args:
            terminal_id: ID of the terminal.
            cols: New column count.
            rows: New row count.

        Returns:
            True if successful, False if terminal not found.
        """
        session = self._sessions.get(terminal_id)
        if not session:
            return False

        session.cols = cols
        session.rows = rows
        self._set_size(session.master_fd, cols, rows)
        return True

    def get_session(self, terminal_id: str) -> TerminalSession | None:
        """Get a terminal session by ID."""
        return self._sessions.get(terminal_id)

    def get_sessions(self) -> list[TerminalSession]:
        """Get all active terminal sessions."""
        return list(self._sessions.values())

    async def _read_output(self, session: TerminalSession) -> None:
        """Read output from terminal and broadcast via event bus."""
        loop = asyncio.get_event_loop()

        while True:
            try:
                # Use select to check for available data
                ready, _, _ = await loop.run_in_executor(
                    None,
                    lambda: select.select([session.master_fd], [], [], 0.1),
                )

                if ready:
                    try:
                        data = os.read(session.master_fd, 4096)
                        if data:
                            await self._event_bus.emit(
                                EventType.TERMINAL_OUTPUT,
                                data.decode("utf-8", errors="replace"),
                                terminal_id=session.id,
                            )
                        else:
                            # EOF - terminal closed
                            break
                    except OSError:
                        break

            except asyncio.CancelledError:
                break
            except Exception:
                # Continue reading on other errors
                continue

    def _set_size(self, fd: int, cols: int, rows: int) -> None:
        """Set the terminal window size."""
        # TIOCSWINSZ expects: rows, cols, xpixel, ypixel
        winsize = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

    async def shutdown(self) -> None:
        """Shutdown all terminal sessions."""
        terminal_ids = list(self._sessions.keys())
        for terminal_id in terminal_ids:
            await self.destroy_terminal(terminal_id)

    def set_title(self, terminal_id: str, title: str) -> bool:
        """Set the terminal title."""
        session = self._sessions.get(terminal_id)
        if session:
            session.title = title
            return True
        return False

    def set_worktree_config(
        self,
        terminal_id: str,
        worktree_path: str | None,
        worktree_branch: str | None,
    ) -> bool:
        """Set the worktree configuration for a terminal."""
        session = self._sessions.get(terminal_id)
        if session:
            session.worktree_path = worktree_path
            session.worktree_branch = worktree_branch
            return True
        return False
