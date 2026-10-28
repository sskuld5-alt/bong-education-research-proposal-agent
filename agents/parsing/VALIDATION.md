# 파싱 에이전트 실행 확인

- 확인일: 2026-10-27 (Asia/Seoul)
- 엔진: 공식 npm Kordoc 4.24.13, 프로젝트 전용 설치
- 입력: W3C 공개 시험 PDF, https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
- 원본 SHA-256: `3df79d34abbca99308e79cb94461c1893582604d68329a41fd4bec1885e6adb4`
- 시험 옵션: `ocr: false`, `ocrLines: true`, `images: false`, `scriptTags: true`

| 확인 항목 | 결과 |
|---|---|
| 실행기 JavaScript 문법·도움말 | 통과 |
| 실제 Kordoc PDF 파싱과 JSON·Markdown·기록 저장 | 통과 |
| Poppler로 확인한 원본과 파싱 페이지 수 | 1 / 1 |
| 원본 렌더와 본문 대조 | 전체 1페이지 1회 검수, 본문 일치 |
| 원본 PDF 변경 여부 | 실행 전·후 SHA-256 일치 |
| 파싱 직후 상태 | 검수 대기, 자동 통과 처리하지 않음 |
| 텍스트가 짧은 페이지의 OCR 경고 | 원본에도 한 문구만 있어 누락이 아님을 검수에서 확인 |
| PDF가 아닌 파일 입력 | 오류·종료 코드 1로 거부 |

이 시험은 한국어 학술논문, 표·수식·다단 또는 스캔본 OCR 정확도를 입증하지 않는다. 실제 수집 문헌은 각 PDF마다 별도의 1회 검수를 거쳐야 한다. 시험용 PDF·렌더·파싱 중간 파일은 임시 폴더에서 제거했으며 연구 산출물로 등록하지 않았다.
