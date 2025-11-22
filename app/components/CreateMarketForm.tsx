'use client';

import { useState } from 'react';
import { useCreateMarket } from '../hooks/useMarkets';
import { OracleType } from '../types';

interface CreateMarketFormProps {
  onSuccess?: () => void;
}

export function CreateMarketForm({ onSuccess }: CreateMarketFormProps) {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [castHash, setCastHash] = useState('');
  const [fid, setFid] = useState('');
  const [channel, setChannel] = useState('');
  const [resolutionDays, setResolutionDays] = useState(7);
  const [oracleType, setOracleType] = useState<OracleType>(OracleType.Social);

  const createMarket = useCreateMarket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolutionTime = new Date();
    resolutionTime.setDate(resolutionTime.getDate() + resolutionDays);

    try {
      await createMarket.mutateAsync({
        question,
        description,
        farcasterContext: {
          castHash: castHash || undefined,
          fid: fid ? parseInt(fid) : undefined,
          channel: channel || undefined,
        },
        resolutionTime,
        oracleType,
      });

      // Reset form
      setQuestion('');
      setDescription('');
      setCastHash('');
      setFid('');
      setChannel('');
      setResolutionDays(7);

      alert('Market created successfully!');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating market:', error);
      alert('Failed to create market. Check console for details.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Question *
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Will this cast reach 1000 likes by end of week?"
          maxLength={200}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">{question.length}/200 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide context and resolution criteria for this market..."
          maxLength={1000}
          rows={4}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">{description.length}/1000 characters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cast Hash
          </label>
          <input
            type="text"
            value={castHash}
            onChange={(e) => setCastHash(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            FID
          </label>
          <input
            type="number"
            value={fid}
            onChange={(e) => setFid(e.target.value)}
            placeholder="12345"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel
          </label>
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="crypto"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Resolution Time: {resolutionDays} days
        </label>
        <input
          type="range"
          value={resolutionDays}
          onChange={(e) => setResolutionDays(parseInt(e.target.value))}
          min="1"
          max="30"
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 day</span>
          <span>30 days</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Oracle Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOracleType(OracleType.Social)}
            className={`py-3 px-4 rounded-lg font-semibold transition-all ${
              oracleType === OracleType.Social
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Social Vote
          </button>
          <button
            type="button"
            onClick={() => setOracleType(OracleType.Automated)}
            className={`py-3 px-4 rounded-lg font-semibold transition-all ${
              oracleType === OracleType.Automated
                ? 'bg-primary-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Automated
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {oracleType === OracleType.Social
            ? 'Market resolved by vote of share holders'
            : 'Market resolved automatically via Farcaster API'}
        </p>
      </div>

      <button
        type="submit"
        disabled={createMarket.isPending}
        className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {createMarket.isPending ? 'Creating Market...' : 'Create Market'}
      </button>
    </form>
  );
}
