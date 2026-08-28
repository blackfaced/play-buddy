/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        /* 平衡积木 warm wooden-toy palette */
        cream: { 50: '#FAF6EE', 100: '#F3ECDD' },
        sand: { 200: '#E8DCC5', 300: '#DACBAE' },
        paper: '#FFFDF7',
        ink: { 900: '#3B332A', 600: '#6D6051', 400: '#9C8E7B' },
        terracotta: { 600: '#B85C38', 500: '#C9714A', 100: '#F3E0D3' },
        amber: { 500: '#D9A05B', 100: '#F6E9D2' },
        sage: { 600: '#7A9267', 100: '#E6EBDA' },
        slateblue: { 500: '#7E93A0' },
        brick: { 600: '#BE5A47', 100: '#F5DEDA' },
        status: { green: '#7A9267', yellow: '#C98F3D', red: '#BE5A47' },
      },
      fontFamily: {
        display: ['"ZCOOL KuaiLe"', '"Baloo 2"', '"Noto Sans SC"', 'sans-serif'],
        body: ['"Noto Sans SC"', '"Nunito"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"Noto Sans SC"', 'monospace'],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        'rsm': '8px',
        'rmd': '14px',
        'rlg': '20px',
        'rxl': '28px',
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        card: '0 2px 6px rgba(59,51,42,.06), 0 8px 24px rgba(59,51,42,.07)',
        pop: '0 4px 10px rgba(59,51,42,.08), 0 16px 40px rgba(59,51,42,.12)',
        'inset-well': 'inset 0 2px 10px rgba(59,51,42,.08)',
        btn: '0 2px 0 rgba(59,51,42,.15)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(.4,0,.2,1)',
        pop: 'cubic-bezier(.34,1.56,.64,1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "pulse-dot": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "float-soft": {
          "0%,100%": { transform: "translateY(-4px)" },
          "50%": { transform: "translateY(4px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "float-soft": "float-soft 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
