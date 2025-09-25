const BASE = import.meta.env.VITE_MCP_SERVER_URL;

export async function getCountries() {
  const res = await fetch(`${BASE}/v1/countries`);
  if (!res.ok) throw new Error("Failed to load countries");
  return (await res.json()).countries; // [{name, code}]
}

export async function getFoodSuggestion({ mood, location, dietary = [] }) {
  const res = await fetch(`${BASE}/mcp/get_food_suggestion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood, location, dietary })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Suggest failed: ${res.status} ${text}`);
  }
  return res.json();
}