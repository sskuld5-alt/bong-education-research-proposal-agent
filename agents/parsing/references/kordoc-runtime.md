# Kordoc 실행 참고

## 확인한 공식 근거

- 저장소: https://github.com/chrisryugj/kordoc
- 문서: https://github.com/chrisryugj/kordoc/blob/20810f1d07f33fc34cd26067ec960d77292bca2c/docs/usage.md
- API 타입: 같은 커밋의 `src/types.ts`
- 2026-10-27 확인한 공식 npm 배포 버전: `4.24.13`
- Kordoc `parsePdf()`의 결과는 `success`, `markdown`, `blocks`, `metadata`, `pages`, `warnings`와 PDF 품질 신호를 포함할 수 있다. 실제 필드가 없으면 없다고 기록한다.

## 설치와 실행

프로젝트 루트에서 실행한다. 이는 Skill 설치나 MCP 자동 설정이 아닌 프로젝트 전용 라이브러리 설치이다.

```powershell
node --version
npm.cmd install --prefix .tools/kordoc --no-save --package-lock=false --no-audit --no-fund kordoc@4.24.13
node agents/parsing/scripts/parse-pdf.mjs --pdf "projects/연구명/literature/pdf/L001_연도_저자_제목.pdf"
```

- 설치는 PDF·OCR 의존성도 포함한다. `--omit=optional`은 사용하지 않는다.
- 실행기는 프로젝트의 `.tools/kordoc/node_modules/kordoc`만 사용하며 다른 버전이면 멈춘다.
- 기본 옵션은 `{ ocr: true, ocrLines: true, images: false, scriptTags: true }`이다. 필요한 OCR 모델은 첫 사용 때 다운로드될 수 있고, 모델 부재·다운로드 실패는 기록한다.
- 텍스트 PDF만 시험할 때 `--ocr off`를 붙일 수 있다. 스캔본에 적용해 얻은 빈 본문을 성공으로 처리하지 않는다.
- `images: false`는 그림 바이트를 내보내지 않는다. 그림 자리표시가 실제 그림 복원을 뜻하지 않는다.
- 실행기 stdout의 `runDirectory`를 읽어 실제 산출물 경로를 찾고, 자동 신호를 확인한 다음 원본 대조 검수를 수행한다.
- 실행기 종료 코드 `0`은 파싱 산출물 생성, `1`은 입력·환경 오류, `2`는 파싱 실패·빈 본문·원본 변경 등을 뜻한다. 어떤 코드도 검수 통과를 뜻하지 않는다.

## 검수 도구 구분

- PDF 원본 렌더·페이지 수 확인에는 Poppler(`pdfinfo`, `pdftoppm`) 등 사용 가능한 PDF 도구를 사용한다.
- Kordoc의 `render_document`는 문서 형식별 지원을 확인해야 한다. HWP 렌더 예제를 PDF에도 적용할 수 있다고 가정하지 않는다.
- 공문서용 `lint`, `lint_document`, HWPX용 `validate`는 PDF 원문 추출 품질 검증을 대신하지 않는다.
- Kordoc의 페이지별 빈 문자열은 여러 페이지 연속 표의 구조 특성 때문일 수도 있다. 원본 없이 누락이라고 확정하지 않는다.
