# Rizvi CRM - Quick Reference Guide

## 🎯 Commission System Overview

### How It Works Now:
1. **One employee per project** (either Cold Caller OR Sales Closer)
2. **Auto-calculation** based on: Budget × Employee Commission Rate%
3. **Real-time preview** shows commission before saving

### Example:
```
Project Budget: $10,000
Sales Closer Rate: 15%
Commission: $10,000 × 15% = $1,500
```

---

## 🎨 Theme System

### Toggle Location
- **Sidebar footer** (above Sign Out button)
- Sun icon ☀️ = Currently in dark mode (click for light)
- Moon icon 🌙 = Currently in light mode (click for dark)

### Storage
- Saved in browser's `localStorage`
- Key: `"crm-theme"`
- Values: `"dark"` or `"light"`

---

## 📊 Page Features

### Projects Page
✅ Create/Edit projects with single commission assignment
✅ View details modal with full project breakdown
✅ Filter by date range or specific month
✅ Commission preview in form

### Clients Page
✅ View all client information and projects
✅ Track total budgets and commissions
✅ Filter by status and date
✅ Auto-created when leads close

### Commissions Page
✅ Track employee commissions by project date
✅ View total earned, paid, and remaining
✅ Payment status indicators
✅ Detailed breakdown per employee
✅ Record payments (in development)

---

## 🔄 Workflow Examples

### Create Project with Commission:
1. Click "New Project"
2. Select closed client (budget auto-fills)
3. Enter project details
4. Select "Employee Type" → Sales Closer
5. Choose employee → See commission: $X
6. Save

### Switch Theme:
1. Look at sidebar footer
2. Click Sun/Moon icon
3. Theme changes instantly
4. Reload page → Theme persists

### View Employee Commissions:
1. Go to Commissions page
2. See all employees with payment status
3. Click "View" (eye icon)
4. See all projects and breakdown
5. Use date filter to check specific period

---

## 💡 Tips & Tricks

### Commission Calculation:
- Commission is **automatically calculated** when you select employee and have a budget
- Change employee → commission updates instantly
- Change budget → commission recalculates

### Date Filtering:
- Available on **all three main pages**
- Choose "Custom Range" for specific dates
- Choose "By Month" for quick monthly views
- Filter shows **last 12 months** for easy selection

### Theme Preference:
- Set once, remembered forever (per browser)
- Works across all pages and modals
- Clears only if you clear browser data

---

## 🚨 Important Notes

### Single Employee Rule:
- ❌ Cannot assign both Sales Closer AND Cold Caller
- ✅ Must choose ONE employee type per project
- **Why?** Clearer responsibility, no double-charging

### Data Persistence:
- All data saved to **Firebase Firestore**
- Real-time updates across all devices
- Theme saved to **browser localStorage**

### Payment Tracking:
- Currently shows structure (Total/Paid/Remaining)
- "Record Payment" button ready for full implementation
- Status: Paid ✅ | Partial 🟡 | Unpaid ❌

---

## 🎯 Color Guide

### Employee Types:
- 🔵 **Indigo** = Sales Closers
- 🟡 **Yellow** = Cold Callers

### Financial:
- 🟢 **Green** = Income, Paid, Profits
- 🔴 **Red** = Costs, Commission, Unpaid
- 🟠 **Orange** = Remaining, Partial Payments

### Status:
- 🔵 **Blue** = Meeting
- 🟢 **Green** = Closed
- 🔴 **Red** = Rejected

---

## 📱 Mobile Friendly

- Responsive on all devices
- Sidebar collapses on mobile
- Hamburger menu for navigation
- Touch-friendly buttons and toggles

---

## 🔐 Security

- Firebase Authentication
- User email shown in sidebar
- Sign out button always accessible
- Protected routes (dashboard only when logged in)

---

## 🆘 Troubleshooting

### Theme not saving?
- Check browser settings allow localStorage
- Try different browser
- Clear cache and reload

### Commission not calculating?
- Make sure budget is entered
- Verify employee is selected
- Check employee has commission rate set

### Can't see old projects?
- Check date filter isn't active
- Click "Filter by Date" → "Clear Dates"

### Payment tracking not working?
- Payment system structure is ready
- Full implementation coming soon
- Currently shows $0 paid for all

---

## 📞 Need Help?

Check the detailed documentation:
- `FEATURES_IMPLEMENTED.md` - Complete feature list
- `THEME_AND_COMMISSION_UPDATE.md` - Recent changes
- This file - Quick daily reference
