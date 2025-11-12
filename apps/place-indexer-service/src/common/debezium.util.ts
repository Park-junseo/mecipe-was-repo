// apps/place-indexer-service/src/common/debezium.util.ts
export class DebeziumUtil {
  static unwrap<T>(messageValue: { payload: unknown }): {
    op: string | null;
    after: T | null;
    before: T | null;
    source: unknown;
    original: { payload: unknown };
  } {
    if (!messageValue || !messageValue.payload) {
      // Debezium heartbeat 메시지나 다른 구조의 메시지일 수 있음
      return {
        op: null,
        after: null,
        before: null,
        source: null,
        original: messageValue,
      };
    }

    const payload = messageValue.payload as {
      op: string;
      after: unknown;
      before: unknown;
      source: unknown;
    };
    const op = payload.op; // c: create, u: update, d: delete, r: read (스냅샷)
    const after = payload.after as T; // INSERT 또는 UPDATE 시 데이터
    const before = payload.before as T; // DELETE 시 데이터 (삭제 전 데이터)
    const source = payload.source; // 테이블명, DB 정보 등 메타데이터

    return { op, after, before, source, original: messageValue };
  }
}
