'use strict';

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing code parameter');
  }

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send('GitHub OAuth credentials not configured');
  }

  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    return res.status(500).send('Failed to exchange token with GitHub');
  }

  const EXPECTED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://adelaide-pavilion-website.vercel.app';

  if (tokenData.error) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(
        'authorization:github:error:' + ${JSON.stringify(JSON.stringify({ error: tokenData.error }))},
        ${JSON.stringify(EXPECTED_ORIGIN)}
      );
      window.close();
    </script></body></html>`);
  }

  const content = JSON.stringify({ token: tokenData.access_token, provider: 'github' });

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html><html><body><script>
    (function () {
      function receiveMessage(e) {
        if (e.origin !== ${JSON.stringify(EXPECTED_ORIGIN)}) return;
        window.opener.postMessage(
          'authorization:github:success:' + ${JSON.stringify(content)},
          ${JSON.stringify(EXPECTED_ORIGIN)}
        );
      }
      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', ${JSON.stringify(EXPECTED_ORIGIN)});
    })();
  </script></body></html>`);
};
