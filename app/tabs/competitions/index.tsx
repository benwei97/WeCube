import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Flag from 'react-native-flags';
import axios from 'axios';

interface Competition {
  id: string;
  name: string;
  city: string;
  country: string;
  date: {
    from: string;
    till: string;
  };
}

const Competitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('current');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    axios
      .get('https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/master/api/competitions-page-1.json')
      .then((response) => {
        setCompetitions(response.data.items);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching competitions:', error);
        setLoading(false);
      });
  }, []);

  const currentDate = new Date().getTime();
  const pastMonthDate = new Date().setMonth(new Date().getMonth() - 1);

  const filteredCompetitions = competitions.filter((comp) => {
    const competitionEndDate = new Date(`${comp.date.till}T23:59:59Z`).getTime();
    const competitionStartDate = new Date(`${comp.date.from}T00:00:00Z`).getTime();
    const isUpcoming = competitionStartDate >= currentDate;
    const isRightNow = competitionStartDate <= currentDate && competitionEndDate >= currentDate;
    const isPastMonth = competitionEndDate < currentDate && competitionEndDate >= pastMonthDate;

    if (view === 'current') {
      return (
        (isUpcoming || isRightNow) &&
        (comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    } else if (view === 'past') {
      return (
        isPastMonth &&
        (comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          comp.city.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return false;
  });

  const sortedCompetitions = filteredCompetitions.sort((a, b) => {
    if (view === 'past') {
      return new Date(b.date.till).getTime() - new Date(a.date.till).getTime();
    } else {
      return new Date(a.date.from).getTime() - new Date(b.date.from).getTime();
    }
  });

  const formatDateRange = (from: string, till: string) => {
    const fromDate = new Date(`${from}T00:00:00Z`);
    const tillDate = new Date(`${till}T23:59:59Z`);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
    const fromDateString = new Intl.DateTimeFormat('en-US', options).format(fromDate);
    const tillDateString = new Intl.DateTimeFormat('en-US', options).format(tillDate);

    if (fromDateString === tillDateString) {
      return fromDateString;
    } else {
      return `${fromDateString} - ${tillDateString}`;
    }
  };

  const handleCompetitionClick = (competition: Competition) => {
    router.push({
      pathname: `/tabs/competitions/[competitionId]`,
      params: { competitionId: competition.id, name: competition.name }
    });
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text>Loading competitions...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          {/* View Toggle Buttons */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, view === 'current' && styles.activeViewButton]}
              onPress={() => setView('current')}
            >
              <Text style={[styles.viewButtonText, view === 'current' && styles.activeViewButtonText]}>Current</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, view === 'past' && styles.activeViewButton]}
              onPress={() => setView('past')}
            >
              <Text style={[styles.viewButtonText, view === 'past' && styles.activeViewButtonText]}>Past Month</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Search Competitions"
              placeholderTextColor="#777"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              returnKeyType="search"
            />
            
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>



          {/* Competition List */}
          {sortedCompetitions.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No competitions found.</Text>
            </View>
          ) : (
            <FlatList
              data={sortedCompetitions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.competitionCard} onPress={() => handleCompetitionClick(item)}>
                  <Flag code={item.country} size={48} style={styles.flag} />
                  <View style={styles.detailsContainer}>
                    <Text style={styles.competitionName}>{item.name}</Text>
                    <Text style={styles.competitionDate}>{formatDateRange(item.date.from, item.date.till)}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Competitions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  activeViewButton: {
    backgroundColor: '#007BFF',
  },
  viewButtonText: {
    fontSize: 16,
    color: '#333',
  },
  activeViewButtonText: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  
  clearButton: {
    padding: 8,
    marginLeft: 5,
    borderRadius: 15,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  clearIcon: {
    fontSize: 14,
    color: '#555',
  },
  
  
    competitionCard: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // Android shadow
  },

  flag: {
    marginRight: 15,
  },
  detailsContainer: {
    flex: 1,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  competitionDate: {
    color: '#777',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  
  noResultsText: {
    fontSize: 18,
    color: '#777',
    fontStyle: 'italic',
  },
  
});