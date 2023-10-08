const { YoutubeLoader } = require("langchain/document_loaders/web/youtube");
const {OpenAI} = require("openai");

//new function called getTranscript
async function getTranscript() {
    const loader = YoutubeLoader.createFromUrl("https://www.youtube.com/watch?v=4MROGBovKC0&ab_channel=NeuralNine", {
        language: "en",
        addVideoInfo: false,
    });

    const docs = await loader.load();

    // console.log(docs[0].pageContent)
    return docs[0].pageContent;
}

var text = "";



function splitter(text, chunkSize, chunkOverlap){
    let chunks = [];
    let i = 0;
    while(i < text.length){
        chunks.push(text.substring(i, i + chunkSize));
        i += chunkSize - chunkOverlap;
    }
    console.log()
    console.log(chunks[0])
    return chunks;
}

async function completeChat(text) {
    console.log("\n HERE \n")

    let splitDocs = splitter(text, 10000, 250);
    // let docsSummary = text;

    const openai = new OpenAI({
        apiKey: "<API KEY>"
    });

    //summary template
    const summaryTemplate = `
    Below is the transcript of the video:
    --------
    {text}
    --------
    
    The transcript of the video will also be used to decide if the user should watch the video or not.
    Provide a final decision of whether the user should watch the video or not with an explanation of why.
    
    Total output will be a summary of the video and the final decision of whether the user should watch the video or not with an explanation of why.
    
    `;

    //summary refine template
    const summaryRefineTemplate = `
    We have provided an existing summary up to a certain point: {existing_answer}
    
    Below is the transcript of the video:
    --------
    {text}
    --------
    
    Given the new context, refine the summary and the final decision of whether the user should watch the video or not.
    If the context isn't useful, return the original summary and questions.
    Total output will be a summary of the video and the final decision of whether the user should watch the video or not with an explanation of why.

    `;

    //summarize first one separately
    const firstChunk = splitDocs[0];

    let messages = [
        {
            "role": "system",
            "content": "You are an expert in summarizing YouTube videos. Your goal is to create a summary of a Youtube video so the user knows what the video is about and if they should watch it.",
        },];

    let userMessage = summaryRefineTemplate.replace("{text}", firstChunk);

    messages.push({
        "role": "user", content: userMessage
    });

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0613",
        messages: messages,
        temperature: 0.4,
    });

    let response = completion.choices[0].message.content;

    let finalSummary = response;

    if(splitDocs.length != 1) {
        console.log("\n" + response + "\n");
        // summarize each chunk
        for (let i = 1; i < splitDocs.length; i++) {

            const chunk = splitDocs[i];

            messages = [
                {
                    "role": "system",
                    "content": "You are an expert in summarizing YouTube videos. Your goal is to create a summary of a Youtube video so the user knows what the video is about and if they should watch it.",
                },];

            userMessage = summaryTemplate.replace("{text}", firstChunk);

            messages.push({
                "role": "user", content: userMessage
            });

            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-0613",
                messages: messages,
                temperature: 0.4,
            });

            let response = completion.choices[0].message.content;
            console.log("\n" + response + "\n");


            finalSummary = response;
        }
    }
    console.log("\n" + finalSummary + "\n");
}

async function main() {
    getTranscript()
        .then(transcript => {
            console.log(transcript);
            completeChat(transcript);
        })
        .catch(error => {
            console.error("Error getting transcript:", error);
        });
}

main()