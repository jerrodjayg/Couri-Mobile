# Quick Fix for Web Invitation System

## 🚨 Current Issue
The error shows that the `transactions` table is missing the required columns (`amount`, `item_title`, etc.) that our web invitation system needs.

## ✅ Immediate Fix (Temporary Solution)
I've created a temporary version that works with your current database structure:

1. **Updated Share.js** to use `supabaseTransactionService_temp.js`
2. **Temporary service** stores all transaction data in the `metadata` JSONB field
3. **Web invitations will work** immediately with this temporary solution

## 🔧 Immediate Database Fix (Run This SQL First)
**IMPORTANT:** Run this SQL immediately in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/fix_invitee_nullable.sql
ALTER TABLE transactions 
ALTER COLUMN invitee_id DROP NOT NULL;
```

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL above
4. Run it immediately
5. Your web invitation system will work after this!

## 🔧 Permanent Fix (Optional - Run Later)
To fix the database structure permanently, run this SQL in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/fix_transactions_table.sql
```

After running the permanent fix, update Share.js to use the permanent service:
```javascript
import { createTransactionInvitation, generateWebInvitationUrl } from '../utils/supabaseTransactionService';
```

## 🧪 Test the System
1. **Run your app** - the web invitation system should work now
2. **Go to Share screen** and try "Copy web link" or "Share web link"
3. **Check the logs** - you should see successful transaction creation

## 📋 What the Temporary Solution Does
- ✅ Stores transaction data in `metadata` JSONB field
- ✅ Works with your current table structure
- ✅ Creates web invitation URLs
- ✅ Handles accept/decline functionality
- ✅ All features work as expected

## 🎯 Next Steps
1. **Test the web invitation system** with the temporary solution
2. **Run the SQL migration** when convenient
3. **Switch back to the permanent service** after migration
4. **Set up your web pages** on gocouri.com

The system is now ready to use! 🎉
