## Project

Awesome template project for building a fullstack Progressive Web App (PWA) with Next.js, Tailwind CSS, Shadcn UI, TypeScript, and MongoDB.

## Development

Dear user, please read the entire README before commencing. I hope working with this repo is a pleasant experience. If you have any questions, please feel free to reach out to me,
Alex TK

## Google Maps

Your google maps link

## Google Analytics

Your google analytics link

## Google Tag Manager

Your google tag manager link

## Emails

For email development, we are using react-email. To create or develop an email, go to root > emails, and edit or create an email in tsx format. To preview it, use the command `npm run emails`, and a new development server will run on port 3001 (assuming you're using port 3000 for your next.js development server). This way you can edit your email and view the changes in real time. The emails will generally accept props for their data, but the preview server doesn't take props, so we use the default parameter values for the preview server.

## Development Conventions

- **Folder names** example-folder
- **File names** example-file
- **Component names** example-component
- **Variable names** exampleVariable
- **Function names** exampleFunction
- **Class names** ExampleClass
- **Types** ExampleType
- **Constants** EXAMPLE_CONSTANT
- **Environment Variables** EXAMPLE_ENV_VARIABLE

## Types and Models

Most TypeScript types should live inside each respective Model file, in the models folder. Only if no model exists, use the `types` folder.
For example, when defining types and models use this convention:

```ts
export interface User

export const UserModel
```

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Running the development server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Testing

We use playwright for automated testing.

Useful commands:

Watch tests

```bash
npx playwright test post-one-user --watch
```

Run one test in headed mode

```bash
npx playwright test post-one-user --headed
```

Run codegen to record your actions to a test

```bash
npx playwright codegen http://localhost:3000/
```

## DB Migration Scripts

We can create scripts to migrate users, under the scripts folder. This can be useful if we want to add new properties to our data models, or if we want to reset data. For example, to reset all users, we can run the following command:

```bash
npm run reset-users
```

## Learn More

To learn more, contact Alex T. Karslake
