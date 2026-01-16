const { app } = require("@azure/functions");
const fetch = require("node-fetch");

app.http("message", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    try {
      const inputData = await req.json();

      const mlEndpoint = "https://severity-endpoint.northeurope.inference.ml.azure.com/score";
      const mlKey = process.env.ML_ENDPOINT_KEY;

      const mlResponse = await fetch(mlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mlKey}`,
          "azureml-model-deployment": "blue-v4"
        },
        body: JSON.stringify(inputData)
      });

      if (!mlResponse.ok) {
        const text = await mlResponse.text();
        throw new Error(`ML error ${mlResponse.status}: ${text}`);
      }

      const prediction = await mlResponse.json();

      return {
        status: 200,
        jsonBody: prediction
      };

    } catch (err) {
      context.log.error(err);
      return {
        status: 500,
        jsonBody: { error: err.message }
      };
    }
  }
});
