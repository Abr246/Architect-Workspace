"""
mcp-server — starting point only.

No tools, resources, or prompts are defined yet. This file's only job right
now is to prove the server can start. Capabilities get added in a later step.
"""

from mcp.server import MCPServer

mcp = MCPServer("mcp-server")

if __name__ == "__main__":
    mcp.run(transport="stdio")
