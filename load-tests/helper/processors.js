// Artillery processors for custom functions
// 이 파일은 Artillery 시나리오에서 사용할 수 있는 커스텀 함수를 제공합니다.

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
};

