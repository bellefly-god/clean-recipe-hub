import type { RecipeParseResult } from "@/types/recipe";
import type { PageContext } from "@/shared/types/extension";
import { getDomainFromUrl, isHttpUrl } from "@/shared/utils/url";

interface ParseRecipeOptions {
  pageContext?: PageContext | null;
}

function getMockTitle(pageContext: PageContext | null | undefined, domain: string) {
  const pageTitle = pageContext?.title?.trim();

  if (pageTitle) {
    return pageTitle.replace(/\s*[|\-–]\s*[^|\-–]+$/, "").trim() || pageTitle;
  }

  return `Cleaned recipe from ${domain}`;
}

export async function parseRecipeFromUrl(
  url: string,
  options?: ParseRecipeOptions,
): Promise<RecipeParseResult> {
  if (!isHttpUrl(url)) {
    return {
      success: false,
      error: "Please enter a valid recipe URL starting with http:// or https://.",
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 900));

  const domain = getDomainFromUrl(url);
  const pageContext = options?.pageContext ?? null;

  return {
    success: true,
    recipe: {
      title: getMockTitle(pageContext, domain),
      sourceUrl: url,
      sourceDomain: domain,
      summary:
        pageContext?.description ||
        "A cleaned recipe preview generated through the current parser service. Replace this mock with a real extraction API when ready.",
      ingredients: [
        "1 whole chicken (about 4 lbs)",
        "2 lemons, one sliced and one juiced",
        "4 cloves garlic, minced",
        "2 tablespoons olive oil",
        "1 tablespoon fresh rosemary, chopped",
        "1 tablespoon fresh thyme leaves",
        "1 teaspoon sea salt",
        "1/2 teaspoon black pepper",
        "1 large onion, quartered",
        "4 sprigs fresh parsley",
      ],
      steps: [
        "Preheat your oven to 425°F (220°C).",
        "Pat the chicken dry with paper towels so the skin crisps properly.",
        "Mix olive oil, lemon juice, garlic, rosemary, thyme, salt, and pepper.",
        "Rub the mixture all over the chicken and under the skin where possible.",
        "Stuff the cavity with lemon slices, onion, and parsley.",
        "Roast until the thickest part reaches 165°F (74°C).",
        "Rest for 10 minutes before carving and serving.",
      ],
      notes:
        "Mock parser output. Swap this service implementation for a server-side recipe extraction API without changing the UI flow.",
    },
  };
}
