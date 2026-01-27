# Adding Invitation Pages to gocouri.com

## Option 1: Subdirectory Approach (Recommended)

### URL Structure:
- `gocouri.com/invite/[transaction-id]` → Invitation page
- `gocouri.com/invite/accepted/[transaction-id]` → Accepted page

### Implementation Steps:

#### 1. Create Folder Structure on Your Server:
```
gocouri.com/
├── invite/
│   ├── index.html (or dynamic route)
│   └── accepted/
│       └── index.html (or dynamic route)
└── (your existing content)
```

#### 2. Upload the HTML Files:
- Upload `web-invite.html` as `gocouri.com/invite/index.html`
- Upload `web-accepted.html` as `gocouri.com/invite/accepted/index.html`

#### 3. Configure URL Routing:

**For Static Sites:**
- Just upload the HTML files to the folders
- URLs will work automatically

**For WordPress:**
- Add custom rewrite rules in functions.php:
```php
function custom_invite_routes() {
    add_rewrite_rule('^invite/([^/]+)/?', 'index.php?invite_id=$matches[1]', 'top');
    add_rewrite_rule('^invite/accepted/([^/]+)/?', 'index.php?invite_accepted_id=$matches[1]', 'top');
}
add_action('init', 'custom_invite_routes');
```

**For Custom Server (Apache):**
Add to `.htaccess`:
```apache
RewriteEngine On
RewriteRule ^invite/([^/]+)/?$ /invite/index.html?id=$1 [L]
RewriteRule ^invite/accepted/([^/]+)/?$ /invite/accepted/index.html?id=$1 [L]
```

**For Custom Server (Nginx):**
Add to server config:
```nginx
location ~ ^/invite/([^/]+)/?$ {
    try_files $uri /invite/index.html?id=$1;
}
location ~ ^/invite/accepted/([^/]+)/?$ {
    try_files $uri /invite/accepted/index.html?id=$1;
}
```

#### 4. Update JavaScript to Get Transaction ID:
In both HTML files, update the `getTransactionId()` function:

```javascript
function getTransactionId() {
    // Method 1: From URL path
    const path = window.location.pathname;
    const segments = path.split('/');
    return segments[segments.length - 1];
    
    // Method 2: From query parameter (if using rewrite rules)
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}
```

## Option 2: Subdomain Approach

### URL Structure:
- `invite.gocouri.com/[transaction-id]` → Invitation page
- `accepted.gocouri.com/[transaction-id]` → Accepted page

### Implementation:
1. Create subdomain in your DNS settings
2. Point subdomain to same server or separate hosting
3. Upload HTML files to subdomain directory

## Option 3: Query Parameter Approach

### URL Structure:
- `gocouri.com/invite.html?id=[transaction-id]` → Invitation page
- `gocouri.com/accepted.html?id=[transaction-id]` → Accepted page

### Implementation:
1. Upload HTML files directly to root directory
2. Use query parameters for transaction IDs
3. Update JavaScript to read from URL parameters

## Option 4: Alternative Domain (If you can't modify gocouri.com)

### Free Hosting Options:

#### Netlify (Recommended):
1. Go to [netlify.com](https://netlify.com)
2. Create account and new site
3. Upload HTML files
4. Get URL like: `https://couri-invites.netlify.app`
5. Can use custom domain later

#### Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Import from GitHub or upload files
3. Get URL like: `https://couri-invites.vercel.app`

#### GitHub Pages:
1. Create GitHub repository
2. Upload HTML files
3. Enable GitHub Pages
4. Get URL like: `https://username.github.io/couri-invites`

### Update App Configuration:
In your React Native app, update the URL generation:

```javascript
// For subdirectory approach
const INVITE_BASE_URL = 'https://gocouri.com/invite';#web

// For subdomain approach  
const INVITE_BASE_URL = 'https://invite.gocouri.com';

// For alternative domain
const INVITE_BASE_URL = 'https://couri-invites.netlify.app';

export const generateWebInvitationUrl = (transactionId) => {
  return `${INVITE_BASE_URL}/${transactionId}`;
};
```

## Recommended Solution:
**Use Option 1 (Subdirectory)** - it's the cleanest and most professional approach.

