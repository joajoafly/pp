export default async function handler(req, res) {
    // POST 요청만 허용
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { promptText } = req.body;

    if (!promptText || !promptText.trim()) {
        return res.status(400).json({ error: '프롬프트를 입력해주세요.' });
    }

    // Vercel 환경변수에서 API 키 로드 (브라우저에 노출되지 않음)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    const systemInstruction = `
당신은 AI 앱 개발 강사 및 프롬프트 엔지니어링 전문가입니다.
사용자가 입력한 '앱 개발 기획 프롬프트'를 분석하여 다음 4가지 기준에 따라 엄격하지만 건설적으로 평가하고 점수를 매기세요.

[평가 기준]
1. 아이디어 발굴 (20점 만점): 일상 속 불편함이나 교과 과정의 원리에서 핵심 창작 동기를 도출했는가?
2. 프로젝트 목표 설정 (20점 만점): 애플리케이션의 핵심 가치와 유용성을 개발 목표로 잘 정의했는가?
3. 자유 아이디어 스케치 (10점 만점): 기술적 제약이나 형식에 얽매이지 않고 구현하고 싶은 요소와 기능을 자유롭게 나열했는가?
4. 핵심 구조 체계화 (총 50점 만점):
  - 디자인 (10점): 앱의 전체적인 시각적 분위기와 색상 스타일 정의 여부
  - 레이아웃 (10점): 화면 내부 구역 나누기 및 요소들의 배치 위치 명시 여부
  - 시각 객체 (10점): 주요 캐릭터, 물체, 그래픽 요소 정의 여부
  - UI/UX 조작부 (10점): 사용자가 상호작용하기 위해 누르거나 조작하는 입력 도구 명시 여부
  - 핵심 로직 (10점): 조작에 따라 작동하는 조건, 계산 규칙, 게임 실행 흐름 정의 여부

각 항목별로 점수(score)와 구체적인 피드백(feedback)을 JSON 형식으로 작성하세요.
    `;

    const payload = {
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    totalScore: { type: "INTEGER", description: "총점 (100점 만점)" },
                    ideaGeneration: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } },
                    goalSetting: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } },
                    freeSketch: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } },
                    coreStructure: {
                        type: "OBJECT",
                        properties: {
                            totalSubScore: { type: "INTEGER", description: "핵심 구조 체계화 총합 (50점 만점)" },
                            design: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } },
                            layout: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } },
                            visualObjects: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } },
                            uiux: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } },
                            coreLogic: { type: "OBJECT", properties: { score: { type: "INTEGER" }, feedback: { type: "STRING" } } }
                        }
                    }
                }
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.text();
            console.error('Gemini API Error:', errData);
            return res.status(response.status).json({ error: 'AI 분석 요청에 실패했습니다.' });
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0) {
            const jsonString = data.candidates[0].content.parts[0].text;
            const parsedResult = JSON.parse(jsonString);
            return res.status(200).json(parsedResult);
        } else {
            return res.status(500).json({ error: '결과를 분석할 수 없습니다.' });
        }
    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
}
