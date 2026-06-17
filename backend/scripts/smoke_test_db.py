"""Quick smoke-test for Phase 4 DB queries. Run from backend/ directory."""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


async def main():
    from config import settings
    print(f"DATABASE_URL: {settings.database_url}")

    from db.pool import init_pool, get_pool, close_pool
    await init_pool()
    pool = get_pool()
    from db import queries

    await queries.ensure_user(pool, "smoke-test-user")
    print("ensure_user: OK")

    conv_id = await queries.create_conversation(
        pool, "smoke-test-user",
        "What are the rights of a Data Principal under the DPDP Act?", "en"
    )
    print(f"create_conversation: OK -> {conv_id}")

    uid = await queries.insert_message(pool, conv_id, "user", "What are the rights?", "text", "en")
    aid = await queries.insert_message(pool, conv_id, "assistant", "Under Section 11...", "text", "en")
    print(f"insert_message user: {uid}")
    print(f"insert_message assistant: {aid}")

    history = await queries.load_history(pool, conv_id)
    print(f"load_history: {len(history)} messages -> {history}")

    convs = await queries.list_conversations(pool, "smoke-test-user")
    print(f"list_conversations: {len(convs)} conv(s) -> title={convs[0]['title']}")

    msgs = await queries.list_messages(pool, conv_id)
    print(f"list_messages: {len(msgs)} message(s) -> roles={[m['role'] for m in msgs]}")

    await close_pool()
    print("\nAll DB queries: PASSED")


asyncio.run(main())
