import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ExclamationTriangleIcon,
  FireIcon,
  CloudIcon,
  BoltIcon,
  CogIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import ElectricityMarketAPI from '../../api/client';
import { useGameStore } from '../../store/gameStore';

interface CustomEvent {
  id: string;
  title: string;
  description: string;
  type: 'plant_outage' | 'fuel_shock' | 'weather_event' | 'regulation_change' | 'demand_surge';
  severity: 'low' | 'medium' | 'high';
  duration_years: number;
  impact_description: string;
  affected_utilities: string[];
  custom_parameters: Record<string, any>;
}

const EventManagement: React.FC = () => {
  const { currentSession } = useGameStore();
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CustomEvent | null>(null);
  const [newEvent, setNewEvent] = useState<CustomEvent>({
    id: `event_${Date.now()}`,
    title: '',
    description: '',
    type: 'weather_event',
    severity: 'medium',
    duration_years: 1,
    impact_description: '',
    affected_utilities: [],
    custom_parameters: {}
  });

  // Get all utilities
  const { data: allUtilities } = useQuery({
    queryKey: ['all-utilities', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getAllUtilities(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Get past events
  const { data: pastEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['market-events', currentSession?.id],
    queryFn: () => currentSession ? ElectricityMarketAPI.getMarketEvents(currentSession.id) : null,
    enabled: !!currentSession,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: (event: CustomEvent) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.createMarketEvent(currentSession.id, event);
    },
    onSuccess: () => {
      toast.success('Event created successfully');
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['market-events'] });
    },
    onError: () => {
      toast.error('Failed to create event');
    }
  });

  // Trigger event mutation
  const triggerEventMutation = useMutation({
    mutationFn: (eventId: string) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.triggerMarketEvent(currentSession.id, eventId);
    },
    onSuccess: () => {
      toast.success('Event triggered successfully');
      queryClient.invalidateQueries({ queryKey: ['market-events'] });
    },
    onError: () => {
      toast.error('Failed to trigger event');
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => {
      if (!currentSession) throw new Error('No active session');
      return ElectricityMarketAPI.deleteMarketEvent(currentSession.id, eventId);
    },
    onSuccess: () => {
      toast.success('Event deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['market-events'] });
    },
    onError: () => {
      toast.error('Failed to delete event');
    }
  });

  const handleCreateEvent = () => {
    if (!newEvent.title) {
      toast.error('Event title is required');
      return;
    }
    
    if (!newEvent.description) {
      toast.error('Event description is required');
      return;
    }
    
    createEventMutation.mutate(newEvent);
  };

  const handleTriggerEvent = (eventId: string) => {
    triggerEventMutation.mutate(eventId);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'plant_outage': return <BoltIcon className="w-5 h-5 text-red-400" />;
      case 'fuel_shock': return <FireIcon className="w-5 h-5 text-orange-400" />;
      case 'weather_event': return <CloudIcon className="w-5 h-5 text-blue-400" />;
      case 'regulation_change': return <CogIcon className="w-5 h-5 text-purple-400" />;
      default: return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-900 text-red-300';
      case 'medium': return 'bg-yellow-900 text-yellow-300';
      default: return 'bg-blue-900 text-blue-300';
    }
  };

  // Predefined event templates
  const eventTemplates = [
    {
      title: 'Natural Gas Price Spike',
      description: 'Supply disruption causes natural gas prices to surge',
      type: 'fuel_shock',
      severity: 'high',
      impact_description: 'Higher operating costs for gas plants, margin compression',
      custom_parameters: { gas_price_multiplier: 1.4 }
    },
    {
      title: 'Solar Drought',
      description: 'Extended cloudy conditions reduce solar output',
      type: 'weather_event',
      severity: 'medium',
      impact_description: 'Reduced solar generation, increased reliance on other sources',
      custom_parameters: { solar_reduction: 0.6 }
    },
    {
      title: 'Carbon Price Increase',
      description: 'Government increases carbon price',
      type: 'regulation_change',
      severity: 'medium',
      impact_description: 'Higher costs for fossil fuel plants, renewable advantage',
      custom_parameters: { carbon_price_increase: 25 }
    }
  ];

  const applyEventTemplate = (template: any) => {
    setNewEvent({
      ...newEvent,
      title: template.title,
      description: template.description,
      type: template.type,
      severity: template.severity,
      impact_description: template.impact_description,
      custom_parameters: template.custom_parameters
    });
  };

  if (!currentSession) {
    return (
      <div className="p-6">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-400 mb-2">No Active Game Session</h3>
          <p className="text-gray-300 mb-4">
            Select or create a game session to manage market events.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Event Management</h1>
          <p className="text-gray-400">Create and trigger market events to simulate real-world conditions</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Event Categories */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-center">
          <BoltIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <h3 className="font-medium text-red-300 mb-1">Plant Outages</h3>
          <p className="text-xs text-red-200">Unexpected plant failures</p>
        </div>
        
        <div className="bg-orange-900/20 border border-orange-700 rounded-lg p-4 text-center">
          <FireIcon className="w-8 h-8 text-orange-400 mx-auto mb-2" />
          <h3 className="font-medium text-orange-300 mb-1">Fuel Shocks</h3>
          <p className="text-xs text-orange-200">Fuel price volatility</p>
        </div>
        
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-center">
          <CloudIcon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <h3 className="font-medium text-blue-300 mb-1">Weather Events</h3>
          <p className="text-xs text-blue-200">Renewable availability</p>
        </div>
        
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4 text-center">
          <CogIcon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <h3 className="font-medium text-purple-300 mb-1">Regulation</h3>
          <p className="text-xs text-purple-200">Policy changes</p>
        </div>
        
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 text-center">
          <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <h3 className="font-medium text-yellow-300 mb-1">Demand Surges</h3>
          <p className="text-xs text-yellow-200">Unexpected load changes</p>
        </div>
      </div>

      {/* Available Events */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Available Events</h2>
        
        {eventsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading events...</p>
          </div>
        ) : pastEvents && pastEvents.length > 0 ? (
          <div className="space-y-4">
            {pastEvents.map((event: any) => (
              <div key={event.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getEventTypeIcon(event.type)}
                    <div>
                      <h3 className="font-medium text-white mb-1">{event.title}</h3>
                      <p className="text-sm text-gray-300 mb-2">{event.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeverityClass(event.severity)}`}>
                          {event.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">
                          Duration: {event.duration_years} year(s)
                        </span>
                        {event.triggered && (
                          <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">
                            TRIGGERED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {!event.triggered && (
                      <button
                        onClick={() => handleTriggerEvent(event.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Trigger
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {event.impact_description && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-sm text-gray-400">
                      <span className="text-gray-300 font-medium">Impact:</span> {event.impact_description}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-700 rounded-lg p-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-300 mb-2">No events created yet</p>
            <p className="text-sm text-gray-400">
              Create custom events to simulate real-world market conditions
            </p>
          </div>
        )}
      </div>

      {/* Event History */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Event History</h2>
        
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>
          
          <div className="space-y-6">
            {/* Example events - would be replaced with real data */}
            <div className="relative pl-10">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center">
                <CloudIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">Solar Drought</h3>
                  <span className="text-sm text-gray-400">Year 2026</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  Extended cloudy conditions reduced solar output by 40%
                </p>
                <div className="text-xs text-gray-400">
                  Triggered by Instructor on 05/15/2025
                </div>
              </div>
            </div>
            
            <div className="relative pl-10">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-red-900 flex items-center justify-center">
                <FireIcon className="w-4 h-4 text-red-400" />
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">Natural Gas Price Spike</h3>
                  <span className="text-sm text-gray-400">Year 2025</span>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  Supply disruption caused natural gas prices to surge 40%
                </p>
                <div className="text-xs text-gray-400">
                  Triggered by Instructor on 05/10/2025
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Create Market Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Event Templates */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Quick Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {eventTemplates.map((template, index) => (
                    <button
                      key={index}
                      onClick={() => applyEventTemplate(template)}
                      className="bg-gray-600 hover:bg-gray-500 rounded-lg p-3 text-left transition-colors"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        {getEventTypeIcon(template.type)}
                        <span className="text-white font-medium text-sm">{template.title}</span>
                      </div>
                      <p className="text-xs text-gray-300">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Natural Gas Price Spike"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Event Type
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="plant_outage">Plant Outage</option>
                    <option value="fuel_shock">Fuel Price Shock</option>
                    <option value="weather_event">Weather Event</option>
                    <option value="regulation_change">Regulatory Change</option>
                    <option value="demand_surge">Demand Surge</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Describe what happens in this event..."
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Severity
                  </label>
                  <select
                    value={newEvent.severity}
                    onChange={(e) => setNewEvent({ ...newEvent, severity: e.target.value as any })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration (Years)
                  </label>
                  <input
                    type="number"
                    value={newEvent.duration_years}
                    onChange={(e) => setNewEvent({ ...newEvent, duration_years: Number(e.target.value) })}
                    min="1"
                    max="5"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Impact Description
                  </label>
                  <textarea
                    value={newEvent.impact_description}
                    onChange={(e) => setNewEvent({ ...newEvent, impact_description: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Describe how this event impacts the market..."
                  ></textarea>
                </div>
              </div>

              {/* Custom Parameters */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Custom Parameters</h4>
                
                <div className="space-y-3">
                  {newEvent.type === 'fuel_shock' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Fuel Type
                        </label>
                        <select
                          value={newEvent.custom_parameters.fuel_type || 'natural_gas'}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              fuel_type: e.target.value
                            }
                          })}
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="natural_gas">Natural Gas</option>
                          <option value="coal">Coal</option>
                          <option value="uranium">Uranium</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Price Multiplier
                        </label>
                        <input
                          type="number"
                          value={newEvent.custom_parameters.gas_price_multiplier || 1.4}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              gas_price_multiplier: Number(e.target.value)
                            }
                          })}
                          min="0.5"
                          max="3"
                          step="0.1"
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          1.0 = no change, 1.5 = 50% increase, 0.8 = 20% decrease
                        </p>
                      </div>
                    </>
                  )}
                  
                  {newEvent.type === 'weather_event' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Solar Availability Multiplier
                        </label>
                        <input
                          type="number"
                          value={newEvent.custom_parameters.solar_multiplier || 0.6}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              solar_multiplier: Number(e.target.value)
                            }
                          })}
                          min="0.1"
                          max="1.5"
                          step="0.1"
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Wind Availability Multiplier
                        </label>
                        <input
                          type="number"
                          value={newEvent.custom_parameters.wind_multiplier || 1.0}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              wind_multiplier: Number(e.target.value)
                            }
                          })}
                          min="0.1"
                          max="1.5"
                          step="0.1"
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </>
                  )}
                  
                  {newEvent.type === 'regulation_change' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Carbon Price Change ($/ton)
                        </label>
                        <input
                          type="number"
                          value={newEvent.custom_parameters.carbon_price_increase || 25}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              carbon_price_increase: Number(e.target.value)
                            }
                          })}
                          min="-50"
                          max="100"
                          step="5"
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Use positive values for increases, negative for decreases
                        </p>
                      </div>
                    </>
                  )}
                  
                  {newEvent.type === 'plant_outage' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Capacity Reduction (%)
                        </label>
                        <input
                          type="number"
                          value={(newEvent.custom_parameters.capacity_reduction || 0.15) * 100}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              capacity_reduction: Number(e.target.value) / 100
                            }
                          })}
                          min="5"
                          max="100"
                          step="5"
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Plant Type Affected
                        </label>
                        <select
                          value={newEvent.custom_parameters.plant_type || 'any'}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              plant_type: e.target.value
                            }
                          })}
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="any">Any Plant Type</option>
                          <option value="coal">Coal</option>
                          <option value="natural_gas_cc">Natural Gas CC</option>
                          <option value="natural_gas_ct">Natural Gas CT</option>
                          <option value="nuclear">Nuclear</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {newEvent.type === 'demand_surge' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Demand Increase (%)
                        </label>
                        <input
                          type="number"
                          value={(newEvent.custom_parameters.demand_increase || 0.15) * 100}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              demand_increase: Number(e.target.value) / 100
                            }
                          })}
                          min="5"
                          max="50"
                          step="5"
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Period Affected
                        </label>
                        <select
                          value={newEvent.custom_parameters.period || 'peak'}
                          onChange={(e) => setNewEvent({
                            ...newEvent,
                            custom_parameters: {
                              ...newEvent.custom_parameters,
                              period: e.target.value
                            }
                          })}
                          className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="peak">Peak</option>
                          <option value="shoulder">Shoulder</option>
                          <option value="off_peak">Off-Peak</option>
                          <option value="all">All Periods</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Affected Utilities */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-3">Affected Utilities</h4>
                
                {allUtilities && allUtilities.length > 0 ? (
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newEvent.affected_utilities.length === allUtilities.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewEvent({
                              ...newEvent,
                              affected_utilities: allUtilities.map((u: any) => u.id)
                            });
                          } else {
                            setNewEvent({
                              ...newEvent,
                              affected_utilities: []
                            });
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-300">All Utilities</span>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {allUtilities.map((utility: any) => (
                        <label key={utility.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newEvent.affected_utilities.includes(utility.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewEvent({
                                  ...newEvent,
                                  affected_utilities: [...newEvent.affected_utilities, utility.id]
                                });
                              } else {
                                setNewEvent({
                                  ...newEvent,
                                  affected_utilities: newEvent.affected_utilities.filter(id => id !== utility.id)
                                });
                              }
                            }}
                            className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-300">{utility.username}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No utilities available</p>
                )}
              </div>

              {/* Educational Value */}
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-300 mb-2">Educational Value</h4>
                    <p className="text-sm text-gray-300">
                      Market events create teachable moments about how real-world conditions affect electricity markets.
                      They help students understand risk management, portfolio diversification, and strategic decision-making.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={createEventMutation.isPending || !newEvent.title || !newEvent.description}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg"
                >
                  {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Educational Guidelines */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-700 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-6 h-6 text-purple-400 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-purple-300">Event Management Guidelines</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-white mb-3">🎯 Educational Objectives</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Demonstrate real-world market dynamics</li>
                  <li>• Teach risk management strategies</li>
                  <li>• Show impact of external factors on markets</li>
                  <li>• Illustrate portfolio resilience concepts</li>
                  <li>• Create strategic decision-making scenarios</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">⏱️ Timing Considerations</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Trigger during planning phases</li>
                  <li>• Space events 1-2 years apart</li>
                  <li>• Allow time for adaptation</li>
                  <li>• Consider current market conditions</li>
                  <li>• Align with learning objectives</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-3">🔄 Event Sequencing</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Start with moderate events</li>
                  <li>• Progress to more complex scenarios</li>
                  <li>• Mix different event types</li>
                  <li>• Create cause-effect relationships</li>
                  <li>• Build narrative arcs across years</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-purple-900/30 rounded-lg">
              <h4 className="font-medium text-white mb-2">💡 Best Practices</h4>
              <p className="text-sm text-gray-300">
                Effective market events should be realistic, educational, and create meaningful strategic challenges.
                Always explain the educational purpose of events after triggering them, and use them to highlight
                important market principles. Consider debriefing after significant events to discuss utility responses
                and alternative strategies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventManagement;