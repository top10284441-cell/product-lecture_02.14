document.addEventListener('DOMContentLoaded', () => {
    const GEMINI_API_KEY = "AIzaSyCxue1s7YQYqaMdX9PkcE1FwK7RFrgV8Jg";
    // 최종 수정: 모델 이름을 gemini-pro-vision으로 올바르게 수정합니다.
    const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent";

    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const analyzeButton = document.getElementById('analyzeButton');
    const loadingSpinner = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const animalFaceType = document.getElementById('animalFaceType');
    const animalFaceDescription = document.getElementById('animalFaceDescription');

    async function analyzeWithGemini(base64Image) {
        const parts = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!parts) {
            alert("이미지 형식이 올바르지 않습니다.");
            return { error: "Invalid image format." };
        }
        const mimeType = parts[1];
        const base64Data = parts[2];

        const prompt = `이 사람의 얼굴 사진을 보고 가장 닮은 동물상을 찾아줘. 예를 들어 '강아지상', '고양이상' 등이 있어. 어떤 동물상인지 먼저 말하고, 그 이유와 특징을 재미있고 친절하게 설명해줘. 답변은 반드시 '동물상: [이름]\n설명: [내용]' 이 형식으로만 만들어줘.`;

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }],
            generationConfig: {
                temperature: 0.9
            }
        };

        try {
            const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                let errorJson = {};
                try { errorJson = JSON.parse(errorBody); } catch (e) { /* not a json */ }

                if (errorJson.error && errorJson.error.message) {
                     alert(`분석 오류: ${errorJson.error.message}`);
                } else {
                    alert(`분석 중 오류가 발생했습니다: API 요청 실패 - ${response.status}`);
                }
                throw new Error(`API 요청 실패: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                const fullText = data.candidates[0].content.parts[0].text;
                return parseAnimalResponse(fullText);
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                 alert(`분석이 거부되었습니다: ${data.promptFeedback.blockReason}. 다른 이미지를 사용해 보세요.`);
                return { error: `분석이 거부되었습니다: ${data.promptFeedback.blockReason}` };
            } else {
                alert("AI로부터 유효한 응답을 받지 못했습니다. 자세한 내용은 콘솔을 확인해주세요.");
                console.log("Invalid response data:", data);
                return { error: "AI로부터 유효한 응답을 받지 못했습니다." };
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return { error: "분석 중 치명적인 오류가 발생했습니다." };
        }
    }

    function parseAnimalResponse(text) {
        const animalMatch = text.match(/동물상:s*(.*)/i);
        const descriptionMatch = text.match(/설명:s*([\s\S]*)/i);

        if (animalMatch && descriptionMatch) {
            return {
                animal: animalMatch[1].trim(),
                description: descriptionMatch[1].trim()
            };
        } else {
            alert("AI의 답변 형식이 올바르지 않습니다. AI가 생성한 원문:\n" + text);
            return { 
                animal: "결과 분석 실패", 
                description: "AI의 답변 형식이 올바르지 않습니다." 
            };
        }
    }

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
                analyzeButton.disabled = false;
                resultsSection.style.display = 'none';
                loadingSpinner.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    analyzeButton.addEventListener('click', async () => {
        if (!imageUpload.files[0]) {
            alert('먼저 얼굴 사진을 업로드해주세요.');
            return;
        }

        resultsSection.style.display = 'none';
        loadingSpinner.style.display = 'flex';
        analyzeButton.disabled = true;

        const base64Image = imagePreview.src;
        const analysisResults = await analyzeWithGemini(base64Image);

        loadingSpinner.style.display = 'none';

        if (analysisResults.error) {
           // 에러 발생 시 사용자에게 이미 alert로 알림
        } else {
            animalFaceType.innerText = analysisResults.animal;
            animalFaceDescription.innerText = analysisResults.description;
            resultsSection.style.display = 'block';
        }
        
        analyzeButton.disabled = false;
    });
});
