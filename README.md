## Meilisearch docs crawler

very basic crawler to catch dead links in a nextjs built app.
Next.js tries to pre-fetch the content of URL's, which if dead, throws an error in the console on page load.
This scripts catches the console errors but only focusses on 404 errors.

### Setup

```
npm install
```

### Simple usage

```
npm run start
```

By running the script like this, the default URL is: `https://meilisearch-staging.vercel.app/docs` and the default `URL` path name is `/docs`.

### Change the starting URL

You can change the starting url and the url path by providing it as arguments when calling the script.

```
npm run start "https://meilisearch.com/docs" "/docs/"
```

### Logs

Dead links information are both outputed in the standard output and written in a file named `dead-links.json`
