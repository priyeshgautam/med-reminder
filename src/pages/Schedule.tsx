import React, { useEffect, useState } from 'react';
import { Clock, Calendar, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ManagedUser {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  medication: {
    id: string;
    name: string;
    dosage: string;
    notes?: string;
  };
  time: string;
  days: string[];
  last_taken?: string;
  next_reminder?: string;
}

export default function Schedule() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchSchedules();
    }
  }, [selectedUser]);

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('managed_users')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
      if (data && data.length > 0 && !selectedUser) {
        setSelectedUser(data[0].id);
      }
    } catch (error) {
      toast.error('Error fetching users');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedules() {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id,
          time,
          days,
          last_taken,
          next_reminder,
          medication:medications (
            id,
            name,
            dosage,
            notes
          )
        `)
        .eq('medication.managed_user_id', selectedUser)
        .order('time');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      toast.error('Error fetching schedules');
      console.error('Error:', error);
    }
  }

  async function addSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!medicationName.trim() || !dosage.trim() || !selectedTime || selectedDays.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // First add the medication
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .insert([{
          managed_user_id: selectedUser,
          name: medicationName.trim(),
          dosage: dosage.trim(),
          notes: notes.trim() || null
        }])
        .select()
        .single();

      if (medError) throw medError;

      // Then add the schedule
      const { error: schedError } = await supabase
        .from('schedules')
        .insert([{
          medication_id: medData.id,
          time: selectedTime,
          days: selectedDays
        }]);

      if (schedError) throw schedError;

      // Reset form
      setMedicationName('');
      setDosage('');
      setNotes('');
      setSelectedTime('');
      setSelectedDays([]);
      setShowForm(false);

      toast.success('Medication schedule added successfully');
      fetchSchedules();
    } catch (error) {
      toast.error('Error adding medication schedule');
      console.error('Error:', error);
    }
  }

  const groupSchedulesByDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map(day => ({
      day,
      schedules: schedules.filter(schedule => schedule.days.includes(day))
        .sort((a, b) => a.time.localeCompare(b.time))
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Medication Schedule</h2>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </button>
        </div>

        {showForm && (
          <form onSubmit={addSchedule} className="mb-8 bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="medication" className="block text-sm font-medium text-gray-700">
                  Medication Name
                </label>
                <input
                  type="text"
                  id="medication"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">
                  Dosage
                </label>
                <input
                  type="text"
                  id="dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                Time
              </label>
              <input
                type="time"
                id="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days of Week
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {daysOfWeek.map((day) => (
                  <label key={day} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDays([...selectedDays, day]);
                        } else {
                          setSelectedDays(selectedDays.filter(d => d !== day));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Schedule
              </button>
            </div>
          </form>
        )}

        {schedules.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules</h3>
            <p className="mt-1 text-sm text-gray-500">
              No medication schedules have been set up yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groupSchedulesByDay().map(({ day, schedules: daySchedules }) => (
              <div key={day} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">{day}</h3>
                {daySchedules.length === 0 ? (
                  <p className="text-sm text-gray-500">No medications scheduled</p>
                ) : (
                  <ul className="space-y-3">
                    {daySchedules.map((schedule) => (
                      <li key={`${schedule.id}-${day}`} className="bg-gray-50 rounded-md p-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-500">Medication</span>
                              <h4 className="font-medium text-gray-900">
                                {schedule.medication.name}
                              </h4>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-500">Dosage</span>
                              <p className="text-sm text-gray-600">
                                {schedule.medication.dosage}
                              </p>
                            </div>
                            {schedule.medication.notes && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">Notes</span>
                                <p className="text-sm text-gray-600">
                                  {schedule.medication.notes}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-medium text-gray-500">Time</span>
                              <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(`2000-01-01T${schedule.time}`).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}