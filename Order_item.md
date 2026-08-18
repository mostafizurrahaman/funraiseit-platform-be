# 📦 Manual Order & Order Item Status Management APIs

এখানে কুরিয়ার ট্র্যাকিং বাদে **ক্যাম্পেইন ওনার (Organizer) ও Admin কর্তৃক ম্যানুয়াল স্ট্যাটাস আপডেট, ডেলিভারি ও ক্যানসেলেশন** করার কমপ্লিট API স্পেসিফিকেশন দেওয়া হলো:

---

## 📑 API Endpoints Summary

```
├── /api/v1/order
│   ├── PATCH /:id/cancel               --> [Point 2] পুরো অর্ডার ক্যানসেল করা ও স্টক রিস্টক
│   ├── PATCH /:id/deliver-all          --> [Point 7] পুরো অর্ডারের সব আইটেম একসাথে ডেলিভার্ড করা
│   ├── PATCH /:id/status               --> ম্যানুয়ালি ওভারঅল অর্ডারের স্ট্যাটাস আপডেট
│   ├── GET   /:id                      --> অর্ডারের ডিটেইলস ও আইটেম লিস্ট দেখা
│   │
│   └── /item
│       ├── PATCH /:itemId/cancel           --> [Point 3] নির্দিষ্ট একটি আইটেম ক্যানসেল করা ও স্টক রিস্টক
│       ├── PATCH /:itemId/deliver-physical --> [Point 4] সিঙ্গেল ফিজিক্যাল আইটেম শিপ/ডেলিভার করা
│       ├── PATCH /:itemId/fulfill-digital  --> [Point 5, 6] সিঙ্গেল ডিজিটাল আইটেম ফুলফিল ও ডাউনলোড ইমেইল ডেলিভারি
│       └── PATCH /:itemId/status           --> সিঙ্গেল আইটেমের স্ট্যাটাস আপডেট (with auto-sync)
```

---

## ১. 🛑 Cancel Entire Order API (Point 2)

### `PATCH /api/v1/order/:id/cancel`
> **For what**: সম্পূর্ণ অর্ডার ক্যানসেল করা এবং সমস্ত নন-ক্যানসেলড ফিজিক্যাল আইটেমের স্টক ইনভেন্টরিতে ফেরত দেওয়া।

#### ⚙️ Business & Execution Logic:
1. **Authorization Check**: শুধুমাত্র অর্ডারের ক্যাম্পেইনের Organizer বা Admin কল করতে পারবে।
2. **Validation**: 
   - অর্ডারটি ডাটাবেজে থাকতে হবে (`404 Not Found`)।
   - অর্ডার যদি ইতিমধ্যে `CANCELLED` বা `DELIVERED` থাকে $\rightarrow$ এরর (`400 Bad Request`)।
3. **Inventory Restock**: অর্ডারের অধীনে থাকা প্রতিটি আনক্যানসেলড ফিজিক্যাল আইটেমের স্টক `PhysicalProduct.stock` এ ফেরত যোগ করা হবে।
4. **Cascade Item Status**: অর্ডারের প্রতিটি আইটেমের স্ট্যাটাস `cancelled` হবে।
5. **Parent Order Update**: মূল অর্ডারের স্ট্যাটাস `cancelled` হবে।

---

## ২. ❌ Cancel Single Order Item API (Point 3)

### `PATCH /api/v1/order/item/:itemId/cancel`
> **For what**: একটি অর্ডারের নির্দিষ্ট কোনো প্রোডাক্ট আইটেম ক্যানসেল করা এবং স্টক রিস্টক করা।

#### ⚙️ Business & Execution Logic:
1. **Authorization Check**: শুধুমাত্র অর্ডারের ক্যাম্পেইনের Organizer বা Admin কল করতে পারবে।
2. **Validation**:
   - `OrderItem` খুঁজে বের করতে হবে (`404 Not Found`)।
   - আইটেম যদি ইতিমধ্যে `cancelled`, `shipped` বা `fulfilled` থাকে $\rightarrow$ এরর (`400 Bad Request`)।
3. **Inventory Restock**: ফিজিক্যাল প্রোডাক্ট হলে `PhysicalProduct.stock += quantity` রিস্টক হবে।
4. **Item Update**: আইটেমের স্ট্যাটাস `cancelled` হবে।
5. **Auto-Sync Parent Order**:
   - সব আইটেম `cancelled` হলে $\rightarrow$ মূল অর্ডার `cancelled` হবে।
   - বাকি সব সক্রিয় (নন-ক্যানসেলড) আইটেম ডেলিভার্ড হলে $\rightarrow$ মূল অর্ডার `delivered` হবে।
   - কিছু ডেলিভার্ড ও কিছু পেন্ডিং থাকলে $\rightarrow$ মূল অর্ডার `partially_fulfilled` হবে।

---

## ৩. 🚚 Deliver Physical Product Item (Point 4)

### `PATCH /api/v1/order/item/:itemId/deliver-physical`
> **For what**: একটি অর্ডারের কোনো নির্দিষ্ট ফিজিক্যাল প্রোডাক্ট কাস্টমারকে পাঠানো বা হ্যান্ডওভার করা হলে সেটিকে `shipped` মার্ক করা।

#### ⚙️ Business & Execution Logic:
1. **Authorization Check**: Organizer / Admin ভেরিফিকেশন।
2. **Paid Check**: মূল অর্ডারটি অবশ্যই `paid` বা `partially_fulfilled` হতে হবে (আনপেইড অর্ডারে ডেলিভারি সম্ভব নয়)।
3. **Product Type Check**: প্রোডাক্টটি অবশ্যই `physical` হতে হবে (ডিজিটাল প্রোডাক্ট হলে ডিজিটাল এন্ডপয়েন্টে পাঠাতে বলবে)।
4. **Item Update**: `OrderItem.status = 'shipped'` সেট করা হবে।
5. **Auto-Sync Parent Order**: অর্ডারের সব সক্রিয় আইটেম ডেলিভার্ড হলে মূল অর্ডার `delivered` হবে, অন্যথায় `partially_fulfilled` হবে।

---

## ৪. 💻 Fulfill Digital Product Item & Send Download (Point 5 & 6)

### `PATCH /api/v1/order/item/:itemId/fulfill-digital`
> **For what**: ডিজিটাল প্রোডাক্ট ফুলফিল করা এবং স্বয়ংক্রিয়ভাবে কাস্টমারের ইমেইলে সিকিউর ডাউনলোড লিংক পাঠানো।

#### ⚙️ Business & Execution Logic:
1. **Authorization Check**: Organizer / Admin ভেরিফিকেশন।
2. **Paid Check**: মূল অর্ডারটি অবশ্যই পেইড হতে হবে।
3. **Product Type Check**: প্রোডাক্টটি অবশ্যই `digital` হতে হবে।
4. **Item Update**: `OrderItem.status = 'fulfilled'` সেট করা হবে।
5. **Email Delivery**: সাপোর্টারের ইমেইলে ডিজিটাল প্রোডাক্টের ডাউনলোড লিংক (`digitalFileUrl`) সহ নোটিফিকেশন ইমেইল পাঠানো হবে।
6. **Auto-Sync Parent Order**: সব সক্রিয় আইটেম ফুলফিল হলে মূল অর্ডার `delivered` হবে।

---

## ৫. 📦 Deliver All Order Products at Once (Point 7)

### `PATCH /api/v1/order/:id/deliver-all`
> **For what**: এক ক্লিকে পুরো অর্ডারের সমস্ত পেন্ডিং আইটেম ডেলিভার্ড/ফুলফিল করা।

#### ⚙️ Business & Execution Logic:
1. **Authorization Check**: Organizer / Admin ভেরিফিকেশন।
2. **Paid Check**: মূল অর্ডারটি পেইড হতে হবে।
3. **Bulk Fulfillment**:
   - প্রতিটি পেন্ডিং ফিজিক্যাল আইটেমকে `shipped` করা হবে।
   - প্রতিটি পেন্ডিং ডিজিটাল আইটেমকে `fulfilled` করা হবে এবং সাপোর্টারকে ডাউনলোড লিংক ইমেইল করা হবে।
4. **Parent Order Update**: মূল অর্ডারের স্ট্যাটাস `delivered` এ আপডেট হবে।

---

## ৬. 🔄 Update Single Item Status (Generic)

### `PATCH /api/v1/order/item/:itemId/status`
> **For what**: কোনো আইটেমের স্ট্যাটাস সরাসরি ম্যানুয়ালি পরিবর্তন করতে (`pending`, `fulfilled`, `shipped`, `cancelled`)।
> **Body**: `{ "status": "shipped" }`

---

## ৭. 🛒 Update Whole Order Status (Generic)

### `PATCH /api/v1/order/:id/status`
> **For what**: সম্পূর্ণ অর্ডারের ওভারঅল স্ট্যাটাস ম্যানুয়ালি পরিবর্তন করার জন্য।
> **Body**: `{ "status": "delivered" }`

---

## ৮. 📋 Get Order Details with Items

### `GET /api/v1/order/:id`
> **For what**: ওনার ড্যাশবোর্ডে অর্ডারের বিস্তারিত তথ্য, কাস্টমার ইনফো, পেমেন্ট ব্রেকডাউন এবং প্রতিটি আইটেমের বর্তমান স্ট্যাটাস দেখতে।