import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react'
import tailwind from './tailwind.css?url'
import { parseThemeCookie } from './utils/theme'

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ theme: parseThemeCookie(request.headers.get('Cookie')) })
}

export const SYSTEM_THEME_SCRIPT = `
  if (
    document.documentElement.dataset.theme === "system" &&
    typeof window.matchMedia === "function"
  ) {
    document.documentElement.classList.toggle(
      "dark",
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }
`

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap',
  },
  { rel: 'stylesheet', href: tailwind },
]

export default function App() {
  const { theme } = useLoaderData<typeof loader>()

  return (
    <html lang="en" data-theme={theme} className={theme === 'dark' ? 'dark' : undefined} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
