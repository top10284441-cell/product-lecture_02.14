document.addEventListener('DOMContentLoaded', () => {
    // 1. 여기에 사용처가 제한된 새로운 API 키를 입력하세요.
    const GEMINI_API_KEY = "AIzaSyCxue1s7YQYqaMdX9PkcE1FwK7RFrgV8Jg"; 
    const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const analyzeButton = document.getElementById('analyzeButton');
    const loadingSpinner = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const personalityResult = document.getElementById('personalityResult');
    const financialResult = document.getElementById('financialResult');
    const careerResult = document.getElementById('careerResult');

    async function analyzeWithGemini(base64Image) {
        // Base64 이미지 데이터에서 순수 데이터와 MIME 타입 분리
        const parts = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!parts) {
            return { error: "Invalid image format." };
        }
        const mimeType = parts[1];
        const base64Data = parts[2];

        const prompt = "이 사람의 얼굴 사진을 보고 관상학적 특징(성격, 재물운, 직업운)을 분석해서 한국어로 친절하게 알려줘. 각 항목(성격, 재물운, 직업운)을 명확하게 구분해서 설명해줘.";

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
            }]
        };

        try {
            const response = await fetch(GEMINI_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': GEMINI_API_KEY, // API Key 추가
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log("Gemini API Response:", data); // For debugging

            if (data.candidates && data.candidates.length > 0) {
                const fullText = data.candidates[0].content.parts[0].text;
                return parseGeminiResponse(fullText);
            } else {
                console.warn("No content from Gemini API.");
                return { 
                    personality: "AI가 응답하지 않았습니다. 잠시 후 다시 시도해주세요.",
                    financial: "",
                    career: ""
                };
            }
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            alert(`분석 중 오류가 발생했습니다: GEMINI_API_KEY is not defined. API 키나 네트워크를 확인해주세요.`);
            return { 
                personality: "분석 중 오류가 발생했습니다. API 키를 확인해주세요.",
                financial: "",
                career: ""
            };
        }
    }

    function parseGeminiResponse(text) {
        const personality = text.match(/성격\s*:\s*([\s\S]*?)(?=재물운|$)/i);
        const financial = text.match(/재물운\s*:\s*([\s\S]*?)(?=직업운|$)/i);
        const career = text.match(/직업운\s*:\s*([\s\S]*)/i);

        if (personality || financial || career) {
            return {
                personality: personality ? personality[1].trim() : "분석 결과를 찾을 수 없습니다.",
                financial: financial ? financial[1].trim() : "분석 결과를 찾을 수 없습니다.",
                career: career ? career[1].trim() : "분석 결과를 찾을 수 없습니다."
            };
        }
        // Fallback if parsing fails
        return {
            personality: text,
            financial: "",
            career: ""
        };
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
        } else {
            imagePreview.src = '#';
            imagePreview.style.display = 'none';
            analyzeButton.disabled = true;
            resultsSection.style.display = 'none';
            loadingSpinner.style.display = 'none';
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
        if (!base64Image || base64Image === '#') {
            alert('이미지가 로드되지 않았습니다.');
            loadingSpinner.style.display = 'none';
            analyzeButton.disabled = false;
            return;
        }

        const analysisResults = await analyzeWithGemini(base64Image);

        loadingSpinner.style.display = 'none';

        if(analysisResults.error) {
            alert(analysisResults.error);
        } else {
            personalityResult.innerText = analysisResults.personality;
            financialResult.innerText = analysisResults.financial;
            careerResult.innerText = analysisResults.career;
        }
        
        resultsSection.style.display = 'block';
        analyzeButton.disabled = false;
    });
});