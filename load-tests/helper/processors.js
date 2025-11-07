// Artillery processors for custom functions
// 이 파일은 Artillery 시나리오에서 사용할 수 있는 커스텀 함수를 제공합니다.

function getRandomPage(length) {
  const pages = Array.from({ length: length }, (_, i) => i + 1);
  return pages[Math.floor(Math.random() * length)];
}

module.exports = {
  // 예시: 랜덤 카페 코드 생성
  generateCafeCode: function (context, events, done) {
    // 수정 필요
    const codes = ['CAFE001', 'CAFE002', 'CAFE003', 'CAFE004', 'CAFE005'];
    context.vars.cafeCode = codes[Math.floor(Math.random() * codes.length)];
    return done();
  },

  // 예시: 랜덤 제품 ID 생성
  generateProductId: function (context, events, done) {
    context.vars.productId = Math.floor(Math.random() * 100) + 1;
    return done();
  },

  // Offset 기반 페이지네이션용 랜덤 페이지 설정
  setRandomOffsetPage: function (context, events, done) {
    context.vars.offsetPage = getRandomPage(10) + 990;
    return done();
  },

  // Cursor 기반 페이지네이션용 랜덤 페이지 설정
  setRandomCursorPage: function (context, events, done) {
    context.vars.cursorPage = getRandomPage(10);
    return done();
  },

  // Cursor 기반 페이지네이션용 랜덤 파라미터 설정
  setRandomCursorPaginationInput: function (context, events, done) {
    // const cursorValues = ['aWRfMTAx', 'aWRfMjAx', 'aWRfNTAx', 'aWRfMTAwMQ=='];
    const pages = Array.from({ length: 10 }, (_, i) => i + 1);
    // context.vars.cursorValue =
    //   cursorValues[Math.floor(Math.random() * cursorValues.length)];
    context.vars.cursorPage = pages[Math.floor(Math.random() * pages.length)];
    return done();
  },
};

