const { app } = require("@azure/functions");

app.http("message", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min

    try {
      context.log("message function called");

      const inputData = await req.json();
      const body = JSON.stringify(inputData);

      const mlEndpoint =
        "https://severity-endpoint.northeurope.inference.ml.azure.com/score";

      const apiKey = process.env.ML_ENDPOINT_KEY; // primary or secondary key
      if (!apiKey) {
        throw new Error("ML_ENDPOINT_KEY is not set");
      }

      const mlResponse = await fetch(mlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "Authorization": `Bearer ${apiKey}`, // ✅ CORRECT
          "azureml-model-deployment": "severity-deployment" // MUST MATCH EXACTLY
        },
        body,
        signal: controller.signal
      });

      if (!mlResponse.ok) {
        const text = await mlResponse.text();
        context.log.error("Azure ML error:", text);
        throw new Error(`ML error ${mlResponse.status}`);
      }

      const prediction = await mlResponse.json();

      return {
        status: 200,
        jsonBody: prediction
      };

    } catch (err) {
      if (err.name === "AbortError") {
        return {
          status: 504,
          jsonBody: { error: "Azure ML endpoint timed out" }
        };
      }

      context.log.error("Function error:", err);
      return {
        status: 500,
        jsonBody: { error: err.message }
      };
    } finally {
      clearTimeout(timeout);
    }
  }
});
