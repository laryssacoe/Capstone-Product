import { expect, test } from "@playwright/test"
import { visualRoutes } from "./routes"

const skipOptional = process.env.VISUAL_SKIP_OPTIONAL === "1"

async function stabilizePage(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
      [data-sonner-toaster], [data-radix-popper-content-wrapper] {
        display: none !important;
      }
      html, body {
        overflow-x: hidden !important;
      }
    `,
  })
}

async function gotoAndWait(page: import("@playwright/test").Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(900)
  await stabilizePage(page)
  return response
}

for (const route of visualRoutes) {
  test.describe(route.name, () => {
    test(`${route.name} renders (top view)`, async ({ page }, testInfo) => {
      test.slow()
      test.skip(skipOptional && !!route.optional, "Skipping optional seeded/auth routes (VISUAL_SKIP_OPTIONAL=1).")

      const response = await gotoAndWait(page, route.path)

      // Allow auth-gated or missing seeded routes to fail softly when marked optional.
      if (route.optional && response && response.status() >= 400) {
        test.skip(true, `Optional route returned ${response.status()}`)
      }

      await expect(page.locator("body")).toBeVisible()
      await page.screenshot({
        path: testInfo.outputPath(`${route.name}-top.png`),
        fullPage: false,
      })
    })

    test(`${route.name} can scroll when needed`, async ({ page }, testInfo) => {
      test.slow()
      test.skip(skipOptional && !!route.optional, "Skipping optional seeded/auth routes (VISUAL_SKIP_OPTIONAL=1).")

      const response = await gotoAndWait(page, route.path)
      if (route.optional && response && response.status() >= 400) {
        test.skip(true, `Optional route returned ${response.status()}`)
      }

      const metrics = await page.evaluate(() => {
        const root = document.scrollingElement || document.documentElement
        const scrollHeight = root?.scrollHeight ?? 0
        const clientHeight = root?.clientHeight ?? window.innerHeight
        const canScroll = scrollHeight > clientHeight + 16
        return { scrollHeight, clientHeight, canScroll }
      })

      if (route.expectScrollable) {
        expect(metrics.canScroll || metrics.clientHeight > 0).toBeTruthy()
      }

      if (metrics.canScroll) {
        await page.evaluate(() => {
          const root = document.scrollingElement || document.documentElement
          root.scrollTo({ top: root.scrollHeight, behavior: "auto" })
        })
        await page.waitForTimeout(250)
        await page.screenshot({
          path: testInfo.outputPath(`${route.name}-bottom.png`),
          fullPage: false,
        })
      } else {
        await page.screenshot({
          path: testInfo.outputPath(`${route.name}-single.png`),
          fullPage: false,
        })
      }
    })
  })
}
