এখানে কুরিয়ার ট্র্যাকিং বাদে শুধুমাত্র **ক্যাম্পেইন ওনার (Organizer) কর্তৃক ম্যানুয়াল স্ট্যাটাস আপডেট** করার কমপ্লিট API স্পেসিফিকেশন দেওয়া হলো:

---

# 📦 Manual Order & Order Item Status Management APIs

---

## ১. 📦 Update Single Order Item Status API

### `PATCH /api/v1/order/item/:itemId/status` : Update Status of an Individual Product Item
> **For what**: একটি অর্ডারে একাধিক প্রোডাক্ট থাকলে ক্যাম্পেইন ওনার প্রতিটি প্রোডাক্ট আইটেমের স্ট্যাটাস আলাদাভাবে ম্যানুয়ালি আপডেট করবে (যেমন: একটি আইটেম তৈরি/প্যাক করা হলে `fulfilled`, ডেলিভারি হলে `shipped`, বা কোনো আইটেম দিতে না পারলে `cancelled`)।

#### ⚙️ Business & Execution Logic:
- **Logic 1 (Organizer Authorization Check)**:
  - শুধুমাত্র অথেনটিকেটেড **Organizer** (বা Super Admin) কল করতে পারবে।
  - চেক করতে হবে যে `itemId` টি যে অর্ডারের অংশ, সেই অর্ডারের ক্যাম্পেইনের আসল ওনার (Organizer) এই লগইন করা ইউজার কি না (`403 Forbidden` যদি অন্য কারও অর্ডার হয়)।
- **Logic 2 (Validation & Existence Check)**:
  - `itemId` দিয়ে ডাটাবেজ থেকে `OrderItem` বের করতে হবে (`404 Not Found` যদি না থাকে)।
  - রিকোয়েস্ট বডি থেকে `status` ভ্যালিডেট করতে হবে। গ্রহণযোগ্য মান:
    - `pending` (অপেক্ষমাণ)
    - `fulfilled` (প্যাকড / প্রস্তুত)
    - `shipped` (কাস্টমারকে হস্তান্তর / পাঠানো হয়েছে)
    - `cancelled` (আইটেম বাতিল)
- **Logic 3 (Transition Constraint)**:
  - মূল অর্ডারটি যদি আনপেইড (`pending` / `payment_failed`) অবস্থায় থাকে, তবে আইটেম ডেলিভারি বা ফুলফিল করা যাবে না (`400 Bad Request`)।
- **Logic 4 (Save Item Status)**:
  - `OrderItem` ডকুমেন্টের `status` ফিল্ডে নতুন স্ট্যাটাস সেভ করতে হবে।
- **Logic 5 (Auto-Sync with Parent Order Status)**:
  - আইটেম আপডেট হওয়ার পর ওই অর্ডারের সব আইটেমের বর্তমান অবস্থা পর্যালোচনা করা হবে:
    - **যদি সব আইটেম `shipped` / `fulfilled` হয়ে যায়** $\rightarrow$ মূল অর্ডারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে `delivered` হয়ে যাবে।
    - **যদি কিছু আইটেম `shipped` / `fulfilled` হয় কিন্তু কিছু এখনো `pending` থাকে** $\rightarrow$ মূল অর্ডারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে `partially_fulfilled` হয়ে যাবে।
    - **যদি সব আইটেম `cancelled` হয়ে যায়** $\rightarrow$ মূল অর্ডারের স্ট্যাটাস `cancelled` হয়ে যাবে।
- **Logic 6 (Return Response)**:
  - আপডেটেড OrderItem এবং প্যারেন্ট অর্ডারের কারেন্ট স্ট্যাটাস রিটার্ন করবে।

---

## ২. 🛒 Update Overall Order Status API

### `PATCH /api/v1/order/:id/status` : Update Whole Order Status Manually
> **For what**: ক্যাম্পেইন ওনার সরাসরি সম্পূর্ণ অর্ডারের ওভারঅল স্ট্যাটাস ম্যানুয়ালি পরিবর্তন করার জন্য (যেমন: কাস্টমার পুরো প্যাকেজ হাতে পেলে ওনার এক ক্লিকে অর্ডারটিকে `delivered` মার্ক করবে)।

#### ⚙️ Business & Execution Logic:
- **Logic 1 (Organizer Authorization Check)**:
  - চেক করতে হবে রিকোয়েস্টকারী ইউজার ওই ক্যাম্পেইনের ওনার (Organizer) কি না।
- **Logic 2 (Validation & Existence Check)**:
  - `req.params.id` দ্বারা `Order` খুঁজে বের করতে হবে (`404 Not Found` হ্যান্ডলিং)।
  - রিকোয়েস্ট বডিতে পাঠানো নতুন `status` ভ্যালিডেট করতে হবে:
    - `paid` (পেমেন্ট সম্পন্ন)
    - `partially_fulfilled` (আংশিক সম্পন্ন)
    - `delivered` (সম্পূর্ণ ডেলিভারি সম্পন্ন)
    - `cancelled` (অর্ডার বাতিল)
    - `refunded` (টাকা ফেরত দেওয়া হয়েছে)
- **Logic 3 (Business Transition Rules)**:
  - `pending` (পেমেন্ট ছাড়া) অর্ডারকে সরাসরি `delivered` করা যাবে না।
  - ইতিমধ্যে `refunded` হওয়া অর্ডারকে পুনরায় `delivered` করা যাবে না।
- **Logic 4 (Cascade Update to Order Items)**:
  - ওনার যখন পুরো অর্ডারকে **`delivered`** মার্ক করবে $\rightarrow$ ওই অর্ডারের অধীনে থাকা সব আইটেম স্বয়ংক্রিয়ভাবে **`shipped`** / **`fulfilled`** হয়ে যাবে।
  - ওনার যখন পুরো অর্ডারকে **`cancelled`** মার্ক করবে $\rightarrow$ ওই অর্ডারের সব আইটেম **`cancelled`** মার্ক হয়ে যাবে।
- **Logic 5 (Save & Response)**:
  - অর্ডারের স্ট্যাটাস আপডেট করে আপডেটেড অর্ডার অবজেক্ট সহ `200 OK` রেসপন্স রিটার্ন করবে।

---

## ৩. 📋 Get Order Details with Item List API

### `GET /api/v1/order/:id` : View Order & Its Items
> **For what**: ওনার ড্যাশবোর্ডে অর্ডারের বিস্তারিত তথ্য এবং প্রতিটি আইটেমের স্ট্যাটাস দেখে ম্যানুয়ালি আপডেট বাটন ট্রিগার করার জন্য।

#### ⚙️ Business & Execution Logic:
- **Logic 1**: ওনার ভেরিফিকেশন।
- **Logic 2**: `Order` ডকুমেন্টের সাথে কাস্টমার ইনফো (`customerName`, `customerPhone`, `shippingAddress`) এবং পেমেন্ট ব্রেকডাউন পপুলেট করা।
- **Logic 3**: `OrderItem.find({ order: id })` দিয়ে ওই অর্ডারের সব প্রোডাক্ট আইটেম এবং তাদের বর্তমান স্ট্যাটাস লিস্ট নিয়ে এসে কমপ্লিট ডাটা রিটার্ন করা।