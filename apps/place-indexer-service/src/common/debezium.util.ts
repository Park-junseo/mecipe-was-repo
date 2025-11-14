// apps/place-indexer-service/src/common/debezium.util.ts
export class DebeziumUtil {
  static unwrap<T>(messageValue: unknown): {
    op: string | null;
    after: T | null;
    before: T | null;
    source: unknown;
    original: unknown;
  } {
    const payload = messageValue as {
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
