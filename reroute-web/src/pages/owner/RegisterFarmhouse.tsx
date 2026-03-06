import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Upload,
  X,
  Tv,
  Flame,
  Droplets,
  Chess,
  Dices,
  Volleyball,
  Waves,
} from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { createFarmhouse, uploadFarmhousePhoto } from '../../services/farmhouseService';

const TOTAL_STEPS = 7;

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition ${
              i + 1 < current
                ? 'bg-yellow-500 border-yellow-500 text-white'
                : i + 1 === current
                ? 'border-yellow-500 text-yellow-600 bg-white'
                : 'border-gray-200 text-gray-400 bg-white'
            }`}
          >
            {i + 1 < current ? <CheckCircle2 size={16} /> : i + 1}
          </div>
        ))}
      </div>
      <div className="relative h-1.5 bg-gray-200 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-yellow-500 rounded-full transition-all"
          style={{ width: `${((current - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-500 mt-2">
        Step {current} of {TOTAL_STEPS}
      </p>
    </div>
  );
}

const STEP_TITLES = [
  'Basic Details',
  'Pricing',
  'Photos',
  'Amenities & Games',
  'Rules',
  'KYC',
  'Review & Submit',
];

interface FormData {
  // Step 1
  name: string;
  city: string;
  area: string;
  location: string;
  farmLink: string;
  bedrooms: number;
  capacity: number;
  description: string;
  contactPhone1: string;
  contactPhone2: string;
  // Step 2
  pricing: {
    weeklyDay: number | '';
    weeklyNight: number | '';
    weekendDay: number | '';
    weekendNight: number | '';
    occasionalDay: number | '';
    occasionalNight: number | '';
    extraGuestPrice: number | '';
  };
  // Step 3
  photos: string[];
  // Step 4
  amenities: {
    tv: number;
    geyser: number;
    bonfire: number;
    chess: number;
    carroms: number;
    volleyball: number;
    pool: boolean;
  };
  // Step 5
  rules: {
    unmarriedCouplesAllowed: boolean;
    petsAllowed: boolean;
    quietHours: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
  // Step 6
  kyc: {
    pan: string;
    aadhaar: string;
    bankAccount: string;
    ifsc: string;
    accountHolderName: string;
  };
}

const initialData: FormData = {
  name: '', city: '', area: '', location: '', farmLink: '',
  bedrooms: 1, capacity: 10, description: '',
  contactPhone1: '', contactPhone2: '',
  pricing: {
    weeklyDay: '', weeklyNight: '', weekendDay: '', weekendNight: '',
    occasionalDay: '', occasionalNight: '', extraGuestPrice: '',
  },
  photos: [],
  amenities: { tv: 0, geyser: 0, bonfire: 0, chess: 0, carroms: 0, volleyball: 0, pool: false },
  rules: {
    unmarriedCouplesAllowed: false, petsAllowed: false,
    quietHours: false, quietHoursStart: '22:00', quietHoursEnd: '07:00',
  },
  kyc: { pan: '', aadhaar: '', bankAccount: '', ifsc: '', accountHolderName: '' },
};

export default function RegisterFarmhouse() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(initialData);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) => {
    setData((prev) => ({ ...prev, [key]: val }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadFarmhousePhoto(file, user?.uid ?? 'unknown');
        urls.push(url);
      }
      setData((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
      showToast(`${urls.length} photo(s) uploaded!`, 'success');
    } catch {
      showToast('Photo upload failed', 'error');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (idx: number) => {
    setData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async () => {
    if (!user) { navigate('/login'); return; }
    setSubmitting(true);
    try {
      await createFarmhouse({
        ...data,
        ownerId: user.uid,
        ownerEmail: user.email ?? '',
        status: 'pending',
        pricing: Object.fromEntries(
          Object.entries(data.pricing).map(([k, v]) => [k, v === '' ? 0 : Number(v)])
        ) as FormData['pricing'],
        basicDetails: {
          kyc: data.kyc,
        },
      });
      showToast('Farmhouse submitted for approval!', 'success');
      navigate('/owner/farmhouses');
    } catch {
      showToast('Failed to submit. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = (): boolean => {
    if (step === 1) return !!(data.name && data.city && data.area && data.bedrooms && data.capacity);
    if (step === 3) return data.photos.length > 0;
    return true;
  };

  return (
    <Layout>
      <div className="page-wrap max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Register Farmhouse</h1>
            <p className="text-sm text-gray-500">{STEP_TITLES[step - 1]}</p>
          </div>
        </div>

        <ProgressBar current={step} />

        <div className="card">
          {step === 1 && (
            <Step1
              data={data}
              onChange={(k, v) => setField(k as keyof FormData, v as any)}
            />
          )}
          {step === 2 && (
            <Step2
              pricing={data.pricing}
              onChange={(k, v) =>
                setData((prev) => ({ ...prev, pricing: { ...prev.pricing, [k]: v } }))
              }
            />
          )}
          {step === 3 && (
            <Step3
              photos={data.photos}
              uploading={uploadingPhotos}
              onUpload={handlePhotoUpload}
              onRemove={removePhoto}
            />
          )}
          {step === 4 && (
            <Step4
              amenities={data.amenities}
              onChange={(k, v) =>
                setData((prev) => ({ ...prev, amenities: { ...prev.amenities, [k]: v } }))
              }
            />
          )}
          {step === 5 && (
            <Step5
              rules={data.rules}
              onChange={(k, v) =>
                setData((prev) => ({ ...prev, rules: { ...prev.rules, [k]: v } }))
              }
            />
          )}
          {step === 6 && (
            <Step6
              kyc={data.kyc}
              onChange={(k, v) =>
                setData((prev) => ({ ...prev, kyc: { ...prev.kyc, [k]: v } }))
              }
            />
          )}
          {step === 7 && <Step7 data={data} />}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
            className="btn-outline flex items-center gap-2 disabled:opacity-40"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-2 disabled:opacity-40"
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'}
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ---- Step Components ----

function Step1({ data, onChange }: { data: FormData; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="section-title">Basic Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Farmhouse Name *</label>
          <input className="input-field" value={data.name} onChange={(e) => onChange('name', e.target.value)} placeholder="e.g. Green Valley Farmhouse" />
        </div>
        <div>
          <label className="label">City *</label>
          <input className="input-field" value={data.city} onChange={(e) => onChange('city', e.target.value)} placeholder="e.g. Pune" />
        </div>
        <div>
          <label className="label">Area / Locality *</label>
          <input className="input-field" value={data.area} onChange={(e) => onChange('area', e.target.value)} placeholder="e.g. Mulshi" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Location Description</label>
          <input className="input-field" value={data.location} onChange={(e) => onChange('location', e.target.value)} placeholder="Near XYZ landmark..." />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Google Maps Link</label>
          <input className="input-field" value={data.farmLink} onChange={(e) => onChange('farmLink', e.target.value)} placeholder="https://maps.google.com/..." />
        </div>
        <div>
          <label className="label">Bedrooms *</label>
          <input type="number" min={1} className="input-field" value={data.bedrooms} onChange={(e) => onChange('bedrooms', parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="label">Capacity (guests) *</label>
          <input type="number" min={1} className="input-field" value={data.capacity} onChange={(e) => onChange('capacity', parseInt(e.target.value) || 1)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={4} value={data.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Describe your farmhouse..." />
        </div>
        <div>
          <label className="label">Your Contact Phone 1</label>
          <input className="input-field" value={data.contactPhone1} onChange={(e) => onChange('contactPhone1', e.target.value)} placeholder="+91 9XXXXXXXXX" />
          <p className="text-xs text-gray-400 mt-1">Not shown to guests</p>
        </div>
        <div>
          <label className="label">Your Contact Phone 2</label>
          <input className="input-field" value={data.contactPhone2} onChange={(e) => onChange('contactPhone2', e.target.value)} placeholder="+91 9XXXXXXXXX" />
          <p className="text-xs text-gray-400 mt-1">Not shown to guests</p>
        </div>
      </div>
    </div>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: number | ''; onChange: (v: number | '') => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
        <input
          type="number"
          min={0}
          className="input-field pl-7"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
          placeholder="0"
        />
      </div>
    </div>
  );
}

function Step2({ pricing, onChange }: { pricing: FormData['pricing']; onChange: (k: string, v: number | '') => void }) {
  return (
    <div className="space-y-4">
      <h2 className="section-title">Pricing</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PriceInput label="Weekday – Day Use" value={pricing.weeklyDay} onChange={(v) => onChange('weeklyDay', v)} />
        <PriceInput label="Weekday – Night" value={pricing.weeklyNight} onChange={(v) => onChange('weeklyNight', v)} />
        <PriceInput label="Weekend – Day Use" value={pricing.weekendDay} onChange={(v) => onChange('weekendDay', v)} />
        <PriceInput label="Weekend – Night" value={pricing.weekendNight} onChange={(v) => onChange('weekendNight', v)} />
        <PriceInput label="Holiday – Day Use" value={pricing.occasionalDay} onChange={(v) => onChange('occasionalDay', v)} />
        <PriceInput label="Holiday – Night" value={pricing.occasionalNight} onChange={(v) => onChange('occasionalNight', v)} />
        <PriceInput label="Extra Guest / Night" value={pricing.extraGuestPrice} onChange={(v) => onChange('extraGuestPrice', v)} />
      </div>
    </div>
  );
}

function Step3({
  photos, uploading, onUpload, onRemove,
}: {
  photos: string[];
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="section-title">Photos *</h2>
      <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition">
        <Upload size={32} className="text-gray-400 mb-2" />
        <span className="text-sm text-gray-500">
          {uploading ? 'Uploading...' : 'Click or drag to upload photos'}
        </span>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={onUpload}
          disabled={uploading}
        />
      </label>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((url, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100">
              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(idx)}
                className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {photos.length === 0 && !uploading && (
        <p className="text-sm text-red-500">At least one photo is required.</p>
      )}
    </div>
  );
}

function CountToggle({
  label, icon, value, max, onChange,
}: {
  label: string; icon: React.ReactNode; value: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 text-gray-700">
        <span className="text-yellow-500">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200">-</button>
        <span className="w-5 text-center text-sm font-semibold">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200">+</button>
      </div>
    </div>
  );
}

function Step4({ amenities, onChange }: { amenities: FormData['amenities']; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <h2 className="section-title">Amenities & Games</h2>
      <CountToggle label="TV" icon={<Tv size={18} />} value={amenities.tv} max={3} onChange={(v) => onChange('tv', v)} />
      <CountToggle label="Geyser" icon={<Droplets size={18} />} value={amenities.geyser} max={2} onChange={(v) => onChange('geyser', v)} />
      <CountToggle label="Bonfire" icon={<Flame size={18} />} value={amenities.bonfire} max={1} onChange={(v) => onChange('bonfire', v)} />
      <CountToggle label="Chess" icon={<Chess size={18} />} value={amenities.chess} max={1} onChange={(v) => onChange('chess', v)} />
      <CountToggle label="Carroms" icon={<Dices size={18} />} value={amenities.carroms} max={1} onChange={(v) => onChange('carroms', v)} />
      <CountToggle label="Volleyball" icon={<Volleyball size={18} />} value={amenities.volleyball} max={1} onChange={(v) => onChange('volleyball', v)} />
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 text-gray-700">
          <span className="text-yellow-500"><Waves size={18} /></span>
          <span className="text-sm font-medium">Swimming Pool</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={amenities.pool} onChange={(e) => onChange('pool', e.target.checked)} />
          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
        </label>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
      <span className="text-sm text-gray-700 font-medium">{label}</span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-yellow-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}

function Step5({ rules, onChange }: { rules: FormData['rules']; onChange: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-3">
      <h2 className="section-title">House Rules</h2>
      <Toggle label="Unmarried couples allowed" checked={rules.unmarriedCouplesAllowed} onChange={(v) => onChange('unmarriedCouplesAllowed', v)} />
      <Toggle label="Pets allowed" checked={rules.petsAllowed} onChange={(v) => onChange('petsAllowed', v)} />
      <Toggle label="Quiet hours" checked={rules.quietHours} onChange={(v) => onChange('quietHours', v)} />
      {rules.quietHours && (
        <div className="grid grid-cols-2 gap-4 pl-4">
          <div>
            <label className="label">From</label>
            <input type="time" className="input-field" value={rules.quietHoursStart} onChange={(e) => onChange('quietHoursStart', e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="time" className="input-field" value={rules.quietHoursEnd} onChange={(e) => onChange('quietHoursEnd', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Step6({ kyc, onChange }: { kyc: FormData['kyc']; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="section-title">KYC Details</h2>
      <p className="text-sm text-gray-500">
        Your KYC information is stored securely and used only for payout purposes.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">PAN Number</label>
          <input className="input-field uppercase" value={kyc.pan} onChange={(e) => onChange('pan', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
        </div>
        <div>
          <label className="label">Aadhaar Number</label>
          <input className="input-field" value={kyc.aadhaar} onChange={(e) => onChange('aadhaar', e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={14} />
        </div>
        <div>
          <label className="label">Account Holder Name</label>
          <input className="input-field" value={kyc.accountHolderName} onChange={(e) => onChange('accountHolderName', e.target.value)} placeholder="Full name as per bank" />
        </div>
        <div>
          <label className="label">Bank Account Number</label>
          <input className="input-field" value={kyc.bankAccount} onChange={(e) => onChange('bankAccount', e.target.value)} placeholder="Account number" />
        </div>
        <div>
          <label className="label">IFSC Code</label>
          <input className="input-field uppercase" value={kyc.ifsc} onChange={(e) => onChange('ifsc', e.target.value.toUpperCase())} placeholder="SBIN0001234" maxLength={11} />
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function Step7({ data }: { data: FormData }) {
  const fmt = (v: number | '') => (v === '' || v === 0) ? '—' : `₹${v}`;
  return (
    <div className="space-y-4">
      <h2 className="section-title">Review & Submit</h2>
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Basic Details</h3>
        <SummaryRow label="Name" value={data.name} />
        <SummaryRow label="City" value={data.city} />
        <SummaryRow label="Area" value={data.area} />
        <SummaryRow label="Bedrooms" value={data.bedrooms} />
        <SummaryRow label="Capacity" value={`${data.capacity} guests`} />
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Pricing</h3>
        <SummaryRow label="Weekday Night" value={fmt(data.pricing.weeklyNight)} />
        <SummaryRow label="Weekend Night" value={fmt(data.pricing.weekendNight)} />
        <SummaryRow label="Day Use" value={fmt(data.pricing.weeklyDay)} />
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Photos</h3>
        <p className="text-sm text-gray-700">{data.photos.length} photo(s) uploaded</p>
        {data.photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {data.photos.map((url, i) => (
              <img key={i} src={url} className="w-14 h-14 rounded-lg object-cover" alt={`photo ${i}`} />
            ))}
          </div>
        )}
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Rules</h3>
        <SummaryRow label="Unmarried Couples" value={data.rules.unmarriedCouplesAllowed ? 'Allowed' : 'Not Allowed'} />
        <SummaryRow label="Pets" value={data.rules.petsAllowed ? 'Allowed' : 'Not Allowed'} />
        <SummaryRow label="Quiet Hours" value={data.rules.quietHours ? `${data.rules.quietHoursStart} – ${data.rules.quietHoursEnd}` : 'No'} />
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Your farmhouse will be reviewed by our team before going live. This usually takes 24-48 hours.
      </div>
    </div>
  );
}
