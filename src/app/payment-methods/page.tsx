"use client";

import Link from "next/link";

export default function PaymentMethods() {
  return (
    <div className="info-page">
      <div className="container">
        <header className="info-header">
          <h1>Payment Methods</h1>
          <p>Secure and easy ways to pay for your favorite fashion.</p>
        </header>

        <div className="info-content">
          <section className="info-section">
            <h2>Local Digital Wallets</h2>
            <p>We prioritize local payment solutions for your convenience. You can pay directly using:</p>
            <ul className="info-list">
              <li><strong>eSewa:</strong> Scan our QR code during checkout or transfer to our registered mobile number.</li>
              <li><strong>Khalti:</strong> Quick and secure digital payments via the Khalti app.</li>
              <li><strong>IME Pay:</strong> We also accept transfers via IME Pay.</li>
            </ul>
          </section>

          <section className="info-section">
            <h2>Mobile & Internet Banking</h2>
            <p>We accept transfers from all major A-class commercial banks in Nepal. Simply use your bank&apos;s mobile app to scan our Fonepay QR code at the checkout step.</p>
          </section>

          <section className="info-section">
            <h2>How to Pay</h2>
            <ol className="info-list">
              <li>Add your items to the cart and proceed to checkout.</li>
              <li>Fill in your delivery details.</li>
              <li>You will see our official QR code. Scan it using your preferred app (eSewa, Khalti, or Bank App).</li>
              <li>Upload the payment screenshot and submit your order.</li>
            </ol>
          </section>
        </div>

        <div className="info-footer">
          <Link href="/" className="back-btn">Back to Shopping</Link>
        </div>
      </div>

      <style jsx>{`
        .info-page {
          padding: 8rem 0 5rem;
          min-height: 80vh;
          background: #fff;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 2rem;
        }
        .info-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .info-header h1 {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
          text-transform: uppercase;
        }
        .info-header p {
          color: #666;
          font-size: 1.1rem;
        }
        .info-section {
          margin-bottom: 3.5rem;
        }
        .info-section h2 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 0.5rem;
        }
        .info-section p {
          line-height: 1.7;
          color: #444;
          margin-bottom: 1rem;
        }
        .info-list {
          list-style: none;
          padding: 0;
        }
        .info-list li {
          padding: 0.8rem 0;
          border-bottom: 1px solid #f9f9f9;
          color: #555;
        }
        .info-list li strong {
          color: #111;
          margin-right: 0.5rem;
        }
        .info-footer {
          margin-top: 5rem;
          text-align: center;
          border-top: 1px solid #eee;
          padding-top: 3rem;
        }
        .back-btn {
          display: inline-block;
          padding: 1rem 2.5rem;
          background: #111;
          color: #fff;
          text-decoration: none;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 0.8rem;
          transition: transform 0.2s;
        }
        .back-btn:hover {
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .info-page { padding-top: 6rem; }
          .info-header h1 { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
}
