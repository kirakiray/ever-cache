// @ts-check
const { test, expect } = require("@playwright/test");

test("base function ok", async ({ page }) => {
  await page.goto("http://localhost:5566/tests/test.html");

  await page.getByRole("button", { name: "set and get ok" }).click();
  await page.getByRole("button", { name: "remove ok" }).click();
  await page.getByRole("button", { name: "key ok" }).click();
  await page.getByRole("button", { name: "length ok" }).click();
  await page.getByRole("button", { name: "proxy get and set ok" }).click();
  await page.getByRole("button", { name: "proxy delete ok" }).click();
  await page.getByRole("button", { name: "clear ok" }).click();
});
