(function () {
    const TOKEN_STORAGE_KEY = 'swagger:autoToken';
    const LOGIN_PATHS = ['/api/auth/login', '/api/auth/register'];

    function isLoginRequest(url) {
        if (!url) return false;
        const lower = url.toLowerCase();
        return LOGIN_PATHS.some(path => lower.includes(path));
    }

    function buildAuthObject(token) {
        return {
            Bearer: {
                name: 'Bearer',
                schema: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                },
                value: `Bearer ${token}`
            }
        };
    }

    function authorizeWithToken(token) {
        if (!token || !window.ui || !window.ui.authActions) return;
        window.ui.authActions.authorize(buildAuthObject(token));
    }

    function restoreTokenWhenReady() {
        const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!token) return;
        const readyInterval = setInterval(() => {
            if (window.ui && window.ui.authActions) {
                clearInterval(readyInterval);
                authorizeWithToken(token);
            }
        }, 250);
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = async function () {
        const response = await originalFetch(...arguments);
        try {
            const request = arguments[0];
            const url = typeof request === 'string' ? request : request?.url;
            if (isLoginRequest(url)) {
                const clone = response.clone();
                const data = await clone.json().catch(() => null);
                const token = data?.token;
                if (token) {
                    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
                    authorizeWithToken(token);
                }
            }
        } catch (err) {
            console.warn('Swagger auto-auth token interception failed', err);
        }
        return response;
    };

    window.addEventListener('load', restoreTokenWhenReady);
})();
