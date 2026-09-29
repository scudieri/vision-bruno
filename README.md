# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Deploy na Vercel

O build detecta automaticamente a Vercel (`VERCEL=1`) e gera a saída no formato da Vercel (`.vercel/output`). Fora da Vercel, o comportamento padrão é mantido. Não é necessário `vercel.json`.

1. Na Vercel, clique em **Add New → Project** e importe este repositório do GitHub.
2. **Framework Preset**: "Other" (ou o que for detectado).
3. **Build Command**: `npm run build`
4. **Output Directory**: deixe em branco (padrão).
5. **Node.js Version**: 20.x ou superior (Project Settings → General).
6. **Variáveis de ambiente**: nenhuma é necessária no momento.
7. Clique em **Deploy**.
