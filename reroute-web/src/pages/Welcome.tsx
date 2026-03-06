import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarCheck, QrCode, Star, Users, Home } from 'lucide-react';
import Layout from '../components/layout/Layout';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(27,40,56,0.92) 0%, rgba(27,40,56,0.75) 50%, rgba(27,40,56,0.88) 100%)',
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="mb-4">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase py-1 px-4 rounded-full border mb-6"
              style={{ borderColor: '#D4AF37', color: '#D4AF37' }}
            >
              Premium Farmhouse Stays
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Escape to{' '}
            <span className="gold-text">Nature's Finest</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Discover handpicked luxury farmhouses for your perfect getaway.
            Book effortlessly and pay securely via UPI — no middlemen, no fuss.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="btn-primary text-lg px-8 py-4"
              onClick={() => navigate('/explore')}
            >
              Explore Farmhouses
            </button>
            <button
              className="btn-outline text-lg px-8 py-4"
              onClick={() => navigate('/register')}
            >
              List Your Property
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
          <span className="text-white text-xs tracking-widest uppercase">Scroll</span>
          <div
            className="w-px h-10 animate-pulse"
            style={{ background: '#D4AF37' }}
          />
        </div>
      </section>

      {/* Stats Row */}
      <section
        className="py-12 px-6"
        style={{ background: '#1b2838' }}
      >
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: '50+', label: 'Farmhouses' },
            { value: '1000+', label: 'Guests Hosted' },
            { value: '4.8★', label: 'Average Rating' },
          ].map((stat) => (
            <div key={stat.label}>
              <p
                className="text-4xl font-bold mb-1 gold-text"
              >
                {stat.value}
              </p>
              <p className="text-gray-400 text-sm uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-4">How It Works</h2>
          <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
            From discovery to doorstep — we've made luxury farmhouse booking effortlessly simple.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="card text-center group hover:shadow-xl transition-shadow duration-300">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)' }}
              >
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <div
                className="text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: '#D4AF37' }}
              >
                Step 1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Discover</h3>
              <p className="text-gray-500 leading-relaxed">
                Browse our curated collection of premium farmhouses. Filter by location, capacity,
                price, and amenities to find your perfect retreat.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card text-center group hover:shadow-xl transition-shadow duration-300">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)' }}
              >
                <CalendarCheck className="w-8 h-8 text-white" />
              </div>
              <div
                className="text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: '#D4AF37' }}
              >
                Step 2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Book</h3>
              <p className="text-gray-500 leading-relaxed">
                Select your dates, choose your guests, and send a booking request in seconds.
                Get instant confirmation from the property.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card text-center group hover:shadow-xl transition-shadow duration-300">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)' }}
              >
                <QrCode className="w-8 h-8 text-white" />
              </div>
              <div
                className="text-xs font-bold tracking-widest uppercase mb-3"
                style={{ color: '#D4AF37' }}
              >
                Step 3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Pay via UPI</h3>
              <p className="text-gray-500 leading-relaxed">
                Scan the UPI QR code, complete your payment in your favourite app, and submit
                your UTR for instant verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* UPI Payment Highlight Section */}
      <section
        className="py-20 px-6"
        style={{ background: '#1b2838' }}
      >
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          {/* Left: Text */}
          <div>
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase py-1 px-3 rounded-full mb-5"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
            >
              Simple Payments
            </span>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Pay Instantly with <span className="gold-text">UPI</span>
            </h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              No credit cards, no complicated gateways. Just scan the QR code shown at booking,
              pay via any UPI app — GPay, PhonePe, Paytm — and enter your UTR number.
              We verify and confirm your stay within minutes.
            </p>
            <ul className="space-y-3">
              {[
                'Works with all UPI apps',
                'Instant payment confirmation',
                'Secure UTR-based verification',
                'Zero hidden charges',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-gray-300">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: '#D4AF37', color: '#1b2838' }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Mock QR Card */}
          <div className="flex justify-center">
            <div
              className="rounded-2xl p-8 text-center shadow-2xl w-72"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.3)' }}
            >
              <p
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: '#D4AF37' }}
              >
                ReRoute Pay
              </p>
              {/* Simulated QR grid */}
              <div
                className="w-40 h-40 mx-auto rounded-xl mb-4 flex items-center justify-center"
                style={{ background: 'white' }}
              >
                <div className="grid grid-cols-7 gap-0.5 p-3 w-full h-full">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-sm"
                      style={{
                        background:
                          [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,48].includes(i % 49)
                            ? '#1b2838'
                            : 'transparent',
                        aspectRatio: '1',
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-white font-bold text-lg mb-1">reroutepay@upi</p>
              <p className="text-gray-400 text-xs mb-4">Scan with any UPI app</p>
              <div
                className="rounded-lg py-2 px-4 flex items-center justify-center gap-2"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}
              >
                <QrCode className="w-4 h-4" style={{ color: '#D4AF37' }} />
                <span className="text-sm font-medium" style={{ color: '#D4AF37' }}>
                  UPI Verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="section-title text-center mb-4">Why Choose ReRoute?</h2>
          <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
            We bring together the best farmhouses and the smoothest booking experience.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Home className="w-7 h-7 text-white" />,
                title: 'Curated Properties',
                desc: 'Every farmhouse is personally verified for quality, amenities, and safety before listing.',
              },
              {
                icon: <Users className="w-7 h-7 text-white" />,
                title: 'Group-Friendly',
                desc: 'From intimate escapes to large gatherings — find farmhouses that fit your entire group.',
              },
              {
                icon: <Star className="w-7 h-7 text-white" />,
                title: 'Honest Reviews',
                desc: 'Real reviews from real guests. Make informed decisions with transparent ratings.',
              },
            ].map((feat) => (
              <div key={feat.title} className="flex gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #D4AF37, #b8960c)' }}
                >
                  {feat.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{feat.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Strip */}
      <section
        className="py-20 px-6 text-center"
        style={{
          background: 'linear-gradient(135deg, #D4AF37 0%, #b8960c 40%, #D4AF37 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready for Your Perfect Getaway?
          </h2>
          <p className="text-yellow-100 mb-8 text-lg">
            Join thousands of guests who've discovered their ideal farmhouse retreat through ReRoute.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="bg-white font-bold py-4 px-10 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-lg"
              style={{ color: '#D4AF37' }}
              onClick={() => navigate('/explore')}
            >
              Start Exploring
            </button>
            <button
              className="border-2 border-white text-white font-bold py-4 px-10 rounded-xl hover:bg-white/10 transition-colors duration-200"
              onClick={() => navigate('/register')}
            >
              List Your Property
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Welcome;
