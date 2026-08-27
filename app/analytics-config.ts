export function getGoogleAnalyticsConfig() {
  const candidates = [
    { variableName: "GA4_MEASUREMENT_ID", value: process.env.GA4_MEASUREMENT_ID },
    { variableName: "NEXT_PUBLIC_GA4_MEASUREMENT_ID", value: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID },
  ];
  const configured = candidates.find(({ value }) => /^G-[A-Z0-9]+$/i.test(value?.trim() || ""));
  return {
    measurementId: configured?.value?.trim() || "",
    variableName: configured?.variableName || null,
  };
}
