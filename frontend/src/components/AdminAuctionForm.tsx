import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  Upload, 
  X, 
  Plus, 
  Calendar, 
  DollarSign, 
  Package, 
  Tag,
  FileText,
  Shield,
  Truck
} from 'lucide-react';

interface AuctionFormData {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  condition: string;
  conditionReport: {
    overall: string;
    defects: string[];
    authenticity: {
      verified: boolean;
      certificate: string;
      verifiedBy: string;
    };
    provenance: string;
  };
  images: Array<{
    url: string;
    alt: string;
    isPrimary: boolean;
    caption: string;
    order: number;
  }>;
  startingPrice: number;
  reservePrice: number;
  bidIncrement: number;
  startTime: string;
  endTime: string;
  status: string;
  shippingInfo: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    shippingCost: number;
    freeShipping: boolean;
  };
  tags: string[];
  featured: boolean;
}

interface AdminAuctionFormProps {
  onSubmit?: (data: AuctionFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<AuctionFormData>;
}

const AdminAuctionForm: React.FC<AdminAuctionFormProps> = ({
  onSubmit,
  onCancel,
  initialData
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState<AuctionFormData>({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    condition: 'good',
    conditionReport: {
      overall: '',
      defects: [],
      authenticity: {
        verified: false,
        certificate: '',
        verifiedBy: ''
      },
      provenance: ''
    },
    images: [],
    startingPrice: 0,
    reservePrice: 0,
    bidIncrement: 1,
    startTime: '',
    endTime: '',
    status: 'draft',
    shippingInfo: {
      weight: 0,
      dimensions: {
        length: 0,
        width: 0,
        height: 0
      },
      shippingCost: 0,
      freeShipping: false
    },
    tags: [],
    featured: false,
    ...initialData
  });

  const [newTag, setNewTag] = useState('');
  const [newDefect, setNewDefect] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const categories = [
    'electronics', 'art', 'jewelry', 'vehicles', 'home', 
    'fashion', 'collectibles', 'antiques', 'books', 'sports', 'music', 'other'
  ];

  const conditions = [
    { value: 'new', label: 'New' },
    { value: 'like-new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'active', label: 'Active' }
  ];

  // Set default start and end times
  useEffect(() => {
    if (!formData.startTime) {
      const now = new Date();
      const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      setFormData(prev => ({
        ...prev,
        startTime: startTime.toISOString().slice(0, 16),
        endTime: endTime.toISOString().slice(0, 16)
      }));
    }
  }, [formData.startTime]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parentField: string, field: string, value: any) => {
    setFormData(prev => {
      const parentObj = prev[parentField as keyof AuctionFormData] as any;
      
      return {
        ...prev,
        [parentField]: {
          ...parentObj,
          [field]: value
        }
      };
    });
  };

  const handleDeepNestedInputChange = (parentField: string, nestedField: string, field: string, value: any) => {
    setFormData(prev => {
      const parentObj = prev[parentField as keyof AuctionFormData] as any;
      const nestedObj = parentObj?.[nestedField] || {};
      
      return {
        ...prev,
        [parentField]: {
          ...parentObj,
          [nestedField]: {
            ...nestedObj,
            [field]: value
          }
        }
      };
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim().toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addDefect = () => {
    if (newDefect.trim()) {
      setFormData(prev => ({
        ...prev,
        conditionReport: {
          ...prev.conditionReport,
          defects: [...prev.conditionReport.defects, newDefect.trim()]
        }
      }));
      setNewDefect('');
    }
  };

  const removeDefect = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditionReport: {
        ...prev.conditionReport,
        defects: prev.conditionReport.defects.filter((_, i) => i !== index)
      }
    }));
  };

  const addImage = () => {
    if (newImageUrl.trim()) {
      const newImage = {
        url: newImageUrl.trim(),
        alt: formData.title || 'Auction item',
        isPrimary: formData.images.length === 0,
        caption: '',
        order: formData.images.length
      };
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, newImage]
      }));
      setNewImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const setPrimaryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => ({
        ...img,
        isPrimary: i === index
      }))
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || user.role !== 'admin') {
      showNotification('Admin privileges required', 'error');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      showNotification('Title is required', 'error');
      return;
    }

    if (!formData.description.trim()) {
      showNotification('Description is required', 'error');
      return;
    }

    if (!formData.category) {
      showNotification('Category is required', 'error');
      return;
    }

    if (formData.startingPrice <= 0) {
      showNotification('Starting price must be greater than 0', 'error');
      return;
    }

    if (formData.reservePrice > 0 && formData.reservePrice < formData.startingPrice) {
      showNotification('Reserve price must be greater than or equal to starting price', 'error');
      return;
    }

    if (new Date(formData.startTime) <= new Date()) {
      showNotification('Start time must be in the future', 'error');
      return;
    }

    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      showNotification('End time must be after start time', 'error');
      return;
    }

    if (formData.images.length === 0) {
      showNotification('At least one image is required', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auctions/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showNotification('Auction created successfully!', 'success');
        if (onSubmit) {
          onSubmit(formData);
        }
      } else {
        showNotification(data.message || 'Failed to create auction', 'error');
      }
    } catch (error) {
      console.error('Error creating auction:', error);
      showNotification('Failed to create auction', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'condition', label: 'Condition', icon: Shield },
    { id: 'images', label: 'Images', icon: Upload },
    { id: 'pricing', label: 'Pricing & Timing', icon: DollarSign },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'advanced', label: 'Advanced', icon: Tag }
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Create New Auction</h2>
        <p className="text-gray-600 mt-2">Fill in the details to create a new auction listing</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter auction title"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed description of the item"
                maxLength={2000}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subcategory
                </label>
                <input
                  type="text"
                  value={formData.subcategory}
                  onChange={(e) => handleInputChange('subcategory', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional subcategory"
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condition *
              </label>
              <select
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {conditions.map(condition => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Condition Tab */}
        {activeTab === 'condition' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Condition Report
              </label>
              <textarea
                value={formData.conditionReport.overall}
                onChange={(e) => handleNestedInputChange('conditionReport', 'overall', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the overall condition of the item"
                maxLength={1000}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Defects
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newDefect}
                  onChange={(e) => setNewDefect(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a defect description"
                  maxLength={200}
                />
                <button
                  type="button"
                  onClick={addDefect}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {formData.conditionReport.defects.map((defect, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <span className="flex-1">{defect}</span>
                    <button
                      type="button"
                      onClick={() => removeDefect(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={formData.conditionReport.authenticity.verified}
                    onChange={(e) => handleDeepNestedInputChange('conditionReport', 'authenticity', 'verified', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Authenticity Verified</span>
                </label>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate
                    </label>
                    <input
                      type="text"
                      value={formData.conditionReport.authenticity.certificate}
                      onChange={(e) => handleDeepNestedInputChange('conditionReport', 'authenticity', 'certificate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Certificate details"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verified By
                    </label>
                    <input
                      type="text"
                      value={formData.conditionReport.authenticity.verifiedBy}
                      onChange={(e) => handleDeepNestedInputChange('conditionReport', 'authenticity', 'verifiedBy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Who verified the authenticity"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provenance
                </label>
                <textarea
                  value={formData.conditionReport.provenance}
                  onChange={(e) => handleNestedInputChange('conditionReport', 'provenance', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="History and ownership details"
                  maxLength={500}
                />
              </div>
            </div>
          </div>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Image URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                <button
                  type="button"
                  onClick={addImage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative border border-gray-300 rounded-lg p-4">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-32 object-cover rounded mb-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                    }}
                  />
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={image.caption}
                      onChange={(e) => {
                        const updatedImages = [...formData.images];
                        updatedImages[index].caption = e.target.value;
                        handleInputChange('images', updatedImages);
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      placeholder="Caption"
                    />
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(index)}
                        className={`text-xs px-2 py-1 rounded ${
                          image.isPrimary 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {image.isPrimary ? 'Primary' : 'Set Primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.images.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No images added yet. Add at least one image to continue.</p>
              </div>
            )}
          </div>
        )}

        {/* Pricing & Timing Tab */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Price * ($)
                </label>
                <input
                  type="number"
                  value={formData.startingPrice}
                  onChange={(e) => handleInputChange('startingPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reserve Price ($)
                </label>
                <input
                  type="number"
                  value={formData.reservePrice}
                  onChange={(e) => handleInputChange('reservePrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bid Increment ($)
                </label>
                <input
                  type="number"
                  value={formData.bidIncrement}
                  onChange={(e) => handleInputChange('bidIncrement', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Shipping Tab */}
        {activeTab === 'shipping' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.shippingInfo.freeShipping}
                onChange={(e) => handleNestedInputChange('shippingInfo', 'freeShipping', e.target.checked)}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Free Shipping</label>
            </div>

            {!formData.shippingInfo.freeShipping && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Cost ($)
                </label>
                <input
                  type="number"
                  value={formData.shippingInfo.shippingCost}
                  onChange={(e) => handleNestedInputChange('shippingInfo', 'shippingCost', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (lbs)
              </label>
              <input
                type="number"
                value={formData.shippingInfo.weight}
                onChange={(e) => handleNestedInputChange('shippingInfo', 'weight', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimensions (inches)
              </label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <input
                    type="number"
                    value={formData.shippingInfo.dimensions.length}
                    onChange={(e) => handleDeepNestedInputChange('shippingInfo', 'dimensions', 'length', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Length"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.shippingInfo.dimensions.width}
                    onChange={(e) => handleDeepNestedInputChange('shippingInfo', 'dimensions', 'width', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Width"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={formData.shippingInfo.dimensions.height}
                    onChange={(e) => handleDeepNestedInputChange('shippingInfo', 'dimensions', 'height', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Height"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleInputChange('featured', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Featured Auction</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Featured auctions appear prominently on the homepage
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              'Create Auction'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAuctionForm;