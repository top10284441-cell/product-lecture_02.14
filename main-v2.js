document.addEventListener('DOMContentLoaded', () => {
    const GEMINI_API_KEY = "AIzaSyCxue1s7YQYqaMdX9PkcE1FwK7RFrgV8Jg";
    // v1beta에서 v1으로 API 엔드포인트 버전을 수정합니다.
    const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent";

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
                const errorText = await response.text();
                // 429 에러(할당량)를 위한 별도 처리
                if (response.status === 429) {
                    throw new Error("API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
                }
                throw new Error(`API 요청 실패: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                const fullText = data.candidates[0].content.parts[0].text;
                return parseAnimalResponse(fullText);
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                // 부적절한 이미지 등의 이유로 차단되었을 경우
                return { error: "분석할 수 없는 이미지입니다. 다른 사진을 이용해주세요." };
            } else {
                return { error: "AI로부터 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요." };
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            alert(`분석 중 오류가 발생했습니다: ${error.message}`);
            return { error: "분석 중 오류가 발생했습니다." };
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
            return { 
                animal: "결과 분석 실패", 
                description: "AI의 답변 형식이 올바르지 않습니다. 다시 시도해 주세요." 
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
            // alert(analysisResults.error); // 분석 실패 시 alert 대신 다른 방식으로 처리 가능
        } else {
            animalFaceType.innerText = analysisResults.animal;
            animalFaceDescription.innerText = analysisResults.description;
            resultsSection.style.display = 'block';
        }
        
        analyzeButton.disabled = false;
    });
});