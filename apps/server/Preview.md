পেমেন্ট ফ্লো-টি ইমপ্লিমেন্ট করার জন্য আপনার কাজের চেকলিস্ট বা Todo List নিচে
দেওয়া হলো:

১. Stripe Utility আপডেট (stripe.ts)

- [ ] stripeCheckoutSession ফাংশনে নতুন একটি প্যারামিটার expires_at যুক্ত করা।
- [ ] Stripe সেশন ক্রিয়েট করার কনফিগারেশনে expires_at পাস করা।

২. Payment Initiate করা (launchCampaignByID ফাংশন)

- [ ] চেক করা: Campaign-এর পেমেন্ট কি আগে থেকেই PAID? হলে Error দেওয়া।
- [ ] চেক করা (Timeout Logic): পেমেন্ট যদি PENDING থাকে, তবে সেটা কি ৩০ মিনিটের
  কম পুরোনো? হলে Error দেওয়া। ৩০ মিনিটের বেশি হলে পুরোনো পেমেন্টকে FAILED করা
  এবং প্রোমোকোড রিলিজ করা।
- [ ] প্রোমোকোড ক্যালকুলেট করে চূড়ান্ত payableAmount বের করা।
- [ ] DB Transaction ওপেন করা।
- [ ] ফ্রি পেমেন্ট চেক: payableAmount === 0 হলে Stripe সেশন তৈরি না করে সরাসরি
  DB-তে পেমেন্ট PAID করে URL null রিটার্ন করা।
- [ ] DB-তে Payment টেবিলে PENDING স্ট্যাটাস দিয়ে একটি নতুন রেকর্ড তৈরি করা।
- [ ] stripeCheckoutSession কল করা (মেটাডাটায় paymentId, campaignId দেওয়া এবং
  expires_at এ বর্তমান সময়ের সাথে ৩০ মিনিট যোগ করে দেওয়া)।
- [ ] Transaction সেভ (Commit) করা এবং Frontend-কে Stripe URL রিটার্ন করা।

৩. Webhook: Payment Success (stripe.services.ts)

- [ ] Stripe থেকে checkout.session.completed ইভেন্ট লিসেন করা।
- [ ] মেটাডাটা থেকে paymentId নিয়ে Payment টেবিলে স্ট্যাটাস আপডেট করে PAID করা।
- [ ] মেটাডাটা থেকে campaignId নিয়ে Campaign টেবিলে স্ট্যাটাস আপডেট করে ACTIVE ও
  paymentStatus = PAID করা।

৪. Webhook: Payment Failed / Expired (stripe.services.ts)

- [ ] Stripe থেকে checkout.session.expired এবং async_payment_failed ইভেন্ট লিসেন
  করা।
- [ ] মেটাডাটা থেকে paymentId নিয়ে Payment টেবিলে স্ট্যাটাস আপডেট করে FAILED
  করা।
- [ ] Campaign টেবিলে paymentStatus = FAILED করা।
- [ ] Promo Code Release: যদি প্রোমোকোড থাকে, তবে তার usedCount -1 করা, Usage
  হিস্ট্রি ডিলেট করা এবং ক্যাম্পেইন থেকে প্রোমোকোডের ভ্যালুগুলো null / 0 করে
  দেওয়া।
