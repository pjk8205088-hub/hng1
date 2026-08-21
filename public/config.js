// Production settings are intentionally kept outside app.js so the same static
// build can be deployed to S3/CloudFront without rebuilding the landing page.
window.HNG_CONFIG = {
  // Set this to the approved ANSA website before publishing.
  ansaWebsite: "",
  // Set an API Gateway / Lambda, Formspree, or other approved lead endpoint.
  leadEndpoint: "",
  // Payment provider links can be added here when the PIX/card accounts are ready.
  pixUrl: "",
  cardUrl: ""
};
