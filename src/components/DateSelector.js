import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

/**
 * DateSelector
 * - affiche un bouton date + bouton heure
 * - ouvre un modal calendrier (grille) pour la date
 * - ouvre un time picker modal pour l'heure
 * Props:
 * - date: Date | null
 * - onChange: function(Date)
 */
export default function DateSelector({ date, onChange }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const handleDayPress = (day) => {
    // day.dateString => 'YYYY-MM-DD'
    const [y, m, d] = day.dateString.split('-').map(Number);
    const base = date instanceof Date ? new Date(date) : new Date();
    base.setFullYear(y, m - 1, d);
    base.setHours(base.getHours(), base.getMinutes(), 0, 0);
    onChange && onChange(base);
    setShowCalendar(false);
    // show time selector optionally:
    setTimeout(() => setShowTime(true), 250);
  };

  const handleConfirmTime = (time) => {
    const base = date instanceof Date ? new Date(date) : new Date();
    base.setHours(time.getHours(), time.getMinutes(), 0, 0);
    onChange && onChange(base);
    setShowTime(false);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <TouchableOpacity style={styles.btn} onPress={() => setShowCalendar(true)}>
          <Text>{date ? date.toLocaleDateString() : 'Sélectionner la date'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, { marginLeft: 8 }]} onPress={() => setShowTime(true)}>
          <Text>{date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Heure'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCalendar} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.calendarContainer}>
            <Calendar
              onDayPress={handleDayPress}
              markedDates={date ? { [date.toISOString().slice(0,10)]: { selected: true } } : {}}
            />
            <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.closeBtn}>
              <Text>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={showTime}
        mode="time"
        onConfirm={handleConfirmTime}
        onCancel={() => setShowTime(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  calendarContainer: { width: '92%', backgroundColor: '#fff', borderRadius: 8, padding: 8 },
  closeBtn: { alignSelf: 'flex-end', padding: 8 },
});