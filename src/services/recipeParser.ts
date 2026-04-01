import type { RecipeParseResult } from "@/types/recipe";

/**
 * TODO: Replace this mock with a real recipe extraction API or Supabase Edge Function.
 *
 * Integration options:
 * 1. Supabase Edge Function that uses a library like `recipe-scrapers` (Python)
 * 2. Third-party API (e.g., Spoonacular, Edamam)
 * 3. Custom scraper using Cheerio / Puppeteer on the server
 *
 * The function signature should stay the same — just replace the mock logic.
 */
export async function parseRecipeFromUrl(url: string): Promise<RecipeParseResult> {
  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      return { success: false, error: "Please enter a valid URL starting with http:// or https://" };
    }
  } catch {
    return { success: false, error: "That doesn't look like a valid URL. Please try again." };
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  const domain = new URL(url).hostname.replace("www.", "");

  // Mock data — returns a realistic sample recipe
  return {
    success: true,
    recipe: {
      title: "Classic Lemon Herb Roasted Chicken",
      sourceUrl: url,
      sourceDomain: domain,
      summary:
        "A beautifully simple roasted chicken with bright lemon and fresh herbs. Crispy skin, juicy meat, and minimal effort — perfect for a weeknight dinner or weekend gathering.",
      ingredients: [
        "1 whole chicken (about 4 lbs)",
        "2 lemons, one sliced and one juiced",
        "4 cloves garlic, minced",
        "2 tablespoons olive oil",
        "1 tablespoon fresh rosemary, chopped",
        "1 tablespoon fresh thyme leaves",
        "1 teaspoon sea salt",
        "½ teaspoon black pepper",
        "1 large onion, quartered",
        "4 sprigs fresh parsley",
      ],
      steps: [
        "Preheat your oven to 425°F (220°C).",
        "Pat the chicken dry with paper towels. This helps the skin get crispy.",
        "Mix olive oil, lemon juice, garlic, rosemary, thyme, salt, and pepper in a small bowl.",
        "Rub the mixture all over the chicken, including under the skin where possible.",
        "Stuff the cavity with lemon slices, onion quarters, and parsley sprigs.",
        "Place the chicken breast-side up in a roasting pan or cast iron skillet.",
        "Roast for 1 hour and 15 minutes, or until the internal temperature reaches 165°F (74°C).",
        "Let the chicken rest for 10 minutes before carving. This keeps the juices in.",
      ],
      notes:
        "For extra crispy skin, let the chicken air-dry uncovered in the fridge for a few hours before roasting. Save the pan drippings — they make an incredible gravy.",
    },
  };
}
