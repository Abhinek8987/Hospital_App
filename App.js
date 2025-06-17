import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ImageBackground,
  Alert,
  Animated,
  Easing,
  ActivityIndicator,
  Image
} from 'react-native';
import CheckBox from 'expo-checkbox';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import Toast from 'react-native-toast-message';
import { Vibration } from 'react-native';
import Signature from 'react-native-signature-canvas';
import TextRecognition from 'react-native-text-recognition';


function generatePatientId() {
  return 'PTN-' + Math.floor(10000 + Math.random() * 90000);
}




const App = () => {
  // User roles and authentication
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
const [showLoginErrorAnim, setShowLoginErrorAnim] = useState(false);
const shakeAnim = useRef(new Animated.Value(0)).current;
const [showLoginCelebration, setShowLoginCelebration] = useState(false);
const [showPdfCelebration, setShowPdfCelebration] = useState(false);
const [erFormErrors, setErFormErrors] = useState({});
const [showHandwritingModal, setShowHandwritingModal] = useState(false);
const [handwritingStep, setHandwritingStep] = useState('name');
const [handwrittenName, setHandwrittenName] = useState('');
const [handwrittenAge, setHandwrittenAge] = useState('');
const [showPreview, setShowPreview] = useState(false);
const [ocrLoading, setOcrLoading] = useState(false);
const nameInputRef = useRef(null);
const ageInputRef = useRef(null);
const [demoNameIndex, setDemoNameIndex] = useState(-1); // Track rotation

  const [balloonAnim] = useState(new Animated.Value(0));

  
  const [users, setUsers] = useState([
    { id: 1, username: 'N', password: 'N', role: 'Nurse', name: 'Nurse Jane' },
    { id: 2, username: 'D', password: 'D', role: 'Doctor', name: 'Dr. Smith' },
    { id: 3, username: 'D2', password: 'D2', role: 'Doctor', name: 'Dr. Johnson' },
  ]);

  const startHandwritingInput = () => {
  setShowHandwritingModal(true);
  setHandwritingStep('name');
  setHandwrittenName('');
  setHandwrittenAge('');
};

const signatureRef = useRef(null);

const handleSignatureSubmit = () => {
  const demoData = {
    ABHI: '21',
    ANUSHKA: '22',
    YUKTHA: '22',
    RAM: '19',
    MOHIT: '65',
  };

  const demoNames = Object.keys(demoData);

  if (handwritingStep === 'name') {
    const nextIndex = (demoNameIndex + 1) % demoNames.length;
    const selectedName = demoNames[nextIndex];

    setHandwrittenName(selectedName);
    setDemoNameIndex(nextIndex);
    setHandwritingStep('age');
  } else {
    const matchedAge = demoData[handwrittenName] || '30';
    setHandwrittenAge(matchedAge);
    setShowPreview(true);
  }
};


const handleNextHandwritingStep = () => {
  if (handwritingStep === 'name') {
    setHandwritingStep('age');
  } else {
    setShowPreview(true);
  }
};

const confirmHandwrittenDetails = () => {
  setErForm({
    ...erForm,
    name: handwrittenName,
    age: handwrittenAge
  });
  setShowHandwritingModal(false);
  setShowPreview(false);
};

const cancelHandwritingInput = () => {
  if (handwritingStep === 'age') {
    setHandwritingStep('name');
  } else {
    setShowHandwritingModal(false);
  }
};

  const triggerShake = () => {
  Animated.sequence([
    Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
    Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
  ]).start();
};


  // Patient data
  const [patients, setPatients] = useState([]);
  const [patientTimelines, setPatientTimelines] = useState({});

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentPatientId, setCurrentPatientId] = useState('');
  const [lastAction, setLastAction] = useState(null);
  const undoTimeoutRef = useRef(null);

  // Forms
  const [showConditionPicker, setShowConditionPicker] = useState(false);

  const [erForm, setErForm] = useState({
  name: '',
  age: '',
  symptoms: 'Fever',
  condition: '', // force user to choose
  hasInsurance: 'no',
  insuranceProvider: '',
  policyNumber: '',
  emergencyContact: '',
  otherInsuranceProvider: ''
});


  const [diagnosisForm, setDiagnosisForm] = useState({
    notes: '',
    observations: ''
  });

  const [prescriptionForm, setPrescriptionForm] = useState({
    meds: '',
    tests: ''
  });

  const [actionForm, setActionForm] = useState({ action: 'Discharge' });

  // UI states
  const [activeScreen, setActiveScreen] = useState('login');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notificationTab, setNotificationTab] = useState('current');

  const [archivedNotifications, setArchivedNotifications] = useState([]);

  const [showTimeline, setShowTimeline] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Symptoms to specialist mapping
  const specialistMapping = {
    'Seizures': 'Neurologist',
    'Chest pain': 'Cardiologist',
    'Heart attack symptoms': 'Cardiologist',
    'Stroke symptoms': 'Neurologist',
    'Head injury': 'Neurosurgeon',
    'Severe burns': 'Burn Specialist',
    'Severe allergic reaction': 'Allergist',
    'Poisoning': 'Toxicologist',
    'Difficulty breathing': 'Pulmonologist',
    'Broken bones': 'Orthopedic Surgeon'
  };

  // Symptoms list
  const symptomsList = [
    'Fever',
    'Chest pain',
    'Difficulty breathing',
    'Severe bleeding',
    'Head injury',
    'Loss of consciousness',
    'Severe burns',
    'Broken bones',
    'Poisoning',
    'Stroke symptoms',
    'Heart attack symptoms',
    'Seizures',
    'Severe allergic reaction',
    'Severe pain'
  ];

  // Insurance providers
  const insuranceProviders = [
    'Medicare',
    'Medicaid',
    'VA Health Care',
    'Tricare',
    'Indian Health Service',
    'State Children\'s Health Insurance Program (SCHIP)',
    'Affordable Care Act (ACA) Plans',
    'Other (Please specify)'
  ];

  // Filter patients based on search and filter criteria
  const getFilteredPatients = () => {
  let filtered = patients;

  if (statusFilter !== 'All') {
    filtered = filtered.filter(patient => patient.status === statusFilter);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(patient => 
      (patient.name || '').toLowerCase().includes(query) ||
      (patient.patientId || '').toLowerCase().includes(query) ||
      (patient.symptoms || '').toLowerCase().includes(query) ||
      (patient.doctorName || '').toLowerCase().includes(query)
    );
  }

  return filtered;
};


  const fetchPatientTimelineFromBackend = async (patientDbId) => {
  try {
    const res = await fetch(`http://192.168.230.128:5000/api/patients/timeline/${patientDbId}`);
    if (!res.ok) throw new Error('Failed to fetch timeline');
    return await res.json();
  } catch (err) {
    console.error("❌ Timeline fetch error:", err.message);
    return [];
  }
};

const fetchPatientsFromBackend = async () => {
  try {
    const response = await fetch("http://192.168.230.128:5000/api/patients");
    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid data format from server');
    }

    const patientsWithTimeline = await Promise.all(
      data.map(async (p) => {
        const timeline = await fetchPatientTimelineFromBackend(p.id);
        return {
          ...p,
          timeline,
          patientId: p.patient_id, // Your readable ID
          id: p.id                 // DB primary key
        };
      })
    );

    setPatients(patientsWithTimeline);
    console.log("🩺 Patients + Timelines loaded:", patientsWithTimeline.length);
  } catch (error) {
    console.error("❌ Failed to fetch patients:", error.message);
    Toast.show({
      type: 'error',
      text1: 'Load Error',
      text2: 'Could not fetch patients from server',
      position: 'top'
    });
  }
};


// ✅ 1. Create notification (call this after diagnosis, prescription, action)
const createNotificationOnBackend = async (message, patientId) => {
  try {
    const doctorName = currentUser?.name || currentUser?.username || "Unknown Doctor";

    await fetch("http://192.168.230.128:5000/api/patients/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: currentUser.id,
        doctor_name: doctorName,
        message,
        patient_id: patientId
      })
    });
  } catch (err) {
    console.error("❌ Failed to create notification:", err.message);
  }
};

// ✅ 2. Fetch notifications from backend
const fetchNotificationsFromBackend = async () => {
  try {
    const response = await fetch(`http://192.168.230.128:5000/api/patients/notifications?doctor_id=${currentUser.id}&archived=false`);
    const data = await response.json();
    setNotifications(data);
  } catch (err) {
    console.error("❌ Failed to fetch notifications:", err.message);
  }
};

// ✅ 3. Archive all notifications
const archiveAllNotifications = async () => {
  try {
    await fetch("http://192.168.230.128:5000/api/patients/notifications/archive", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: currentUser.id
      })
    });

    setNotifications([]);

    Toast.show({
      type: 'success',
      text1: '✅ All notifications archived!',
      textStyle: {
        fontSize: 16,   // match your other toasts' font size
        fontWeight: 'bold'
      },
      visibilityTime: 2000, // show for 2 seconds
      position: 'top',
      autoHide: true,
      topOffset: 50 // keep a bit below the top
    });
    
  } catch (err) {
    console.error("❌ Failed to archive notifications:", err.message);
  }
};


useEffect(() => {
  if (loggedIn && currentUser?.role === 'Doctor' && currentUser?.id && activeScreen === 'doctorDashboard') {
    fetchPatientsFromBackend();
    fetchNotificationsFromBackend();
  }
}, [activeScreen]);


const fetchArchivedNotificationsFromBackend = async () => {
  try {
    const response = await fetch(`http://192.168.230.128:5000/api/patients/notifications?doctor_id=${currentUser.id}&archived=true`);
    const data = await response.json();
    setArchivedNotifications(data);
  } catch (err) {
    console.error("❌ Failed to fetch archived notifications:", err.message);
  }
};


  // Load saved credentials if "Remember Me" was checked
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem('username');
        const savedPassword = await AsyncStorage.getItem('password');
        const savedRememberMe = await AsyncStorage.getItem('rememberMe');

        if (savedRememberMe === 'true' && savedUsername && savedPassword) {
          setUsername(savedUsername);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Failed to load credentials', error);
      }
    };

    loadCredentials();
    AsyncStorage.removeItem('users');
  }, []);



// 🔁 Auto-refresh for doctors every 5 seconds
useEffect(() => {
  if (loggedIn && currentUser?.role === 'Doctor') {
    const interval = setInterval(() => {
      fetchPatientsFromBackend(); // ⏱️ refetch latest patients
    }, 5000); // every 5 seconds

    return () => clearInterval(interval); // cleanup
  }
}, [loggedIn, currentUser]);

  // Generate patient ID only once when component mounts
  useEffect(() => {
    setCurrentPatientId(generatePatientId());
  }, []);

  function generatePatientId() {
    return 'ER-' + Math.floor(1000 + Math.random() * 9000);
  }

  // Show styled alert
  const showAlert = (title, message, isSuccess = true) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'OK', style: 'default' }
      ],
      { 
        cancelable: true,
        userInterfaceStyle: 'light',
      }
    );
  };

  

  // Login function
  const handleLogin = async () => {
  try {
    console.log("🔁 Trying to log in...");

    const response = await fetch("http://192.168.230.128:5000/api/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await response.json();

    console.log("✅ Response Status:", response.status);
    console.log("✅ Response Body:", data);

    if (response.ok) {
      setCurrentUser(data.user);
      setLoggedIn(true);
      setActiveScreen(data.user.role === 'Nurse' ? 'erForm' : 'doctorDashboard');
      setCelebrationMessage(`Welcome ${data.user.role} ${data.user.name || data.user.username}!`);
      setShowLoginCelebration(true);

      if (rememberMe) {
        await AsyncStorage.setItem('username', username);
        await AsyncStorage.setItem('password', password);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        await AsyncStorage.removeItem('username');
        await AsyncStorage.removeItem('password');
        await AsyncStorage.setItem('rememberMe', 'false');
      }
    } else {
      throw new Error(data.error || 'Invalid credentials');
    }

  } catch (error) {
    console.log("❌ Login Error:", error.message);
    triggerShake();
    setShowLoginErrorAnim(true);
    setTimeout(() => setShowLoginErrorAnim(false), 2000);

    Toast.show({
      type: 'custom_error',
      text1: '🚫 Invalid Login',
      text2: error.message,
      position: 'top',
      visibilityTime: 4000
    });

    Vibration.vibrate(200);
  }
};



  // Logout function
  const handleLogout = () => {
    setLoggedIn(false);
    setCurrentUser(null);
    setActiveScreen('login');
  };

  // ER Form submission

const handleErFormSubmit = async () => {
  const errors = {};

  if (!erForm.name.trim()) errors.name = 'Patient name is required';
  if (!erForm.age.trim()) errors.age = 'Age is required';
  if (!erForm.emergencyContact.trim()) errors.emergencyContact = 'Emergency contact number is required';
  if (!erForm.condition) errors.condition = 'Condition is required';

  if (erForm.hasInsurance === 'yes') {
    if (!erForm.insuranceProvider) errors.insuranceProvider = 'Insurance provider is required';
    if (
      erForm.insuranceProvider === 'Other (Please specify)' &&
      !erForm.otherInsuranceProvider.trim()
    ) {
      errors.otherInsuranceProvider = 'Please specify the insurance company';
    }
    if (!erForm.policyNumber.trim()) {
      errors.policyNumber = 'Policy number is required';
    }
  }

  if (Object.keys(errors).length > 0) {
    setErFormErrors(errors);
    Vibration.vibrate(200);
    Toast.show({
      type: 'custom_error',
      text1: '⚠️ Missing Required Fields',
      text2: 'Please complete all highlighted fields.',
      position: 'top',
      visibilityTime: 3000,
    });
    return;
  }

  setErFormErrors({});

  const generatedPatientId = generatePatientId();
  setCurrentPatientId(generatedPatientId);

  let insuranceProvider = erForm.insuranceProvider;
  if (
    erForm.hasInsurance === 'yes' &&
    erForm.insuranceProvider === 'Other (Please specify)'
  ) {
    insuranceProvider = erForm.otherInsuranceProvider || 'Other';
  }

  const payload = {
    name: erForm.name,
    age: parseInt(erForm.age),
    symptoms: erForm.symptoms,
    condition: erForm.condition,
    status: 'Registered',
    emergency_contact: erForm.emergencyContact,
    insurance_provider: insuranceProvider,
    policy_number: erForm.policyNumber,
    doctor_id: currentUser?.id || null,
    patient_id: generatedPatientId
  };

  try {
    // ✅ Register patient first
    const response = await fetch("http://192.168.230.128:5000/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      const newPatient = {
        ...data.patient,
        patientId: data.patient.patient_id,
        id: data.patient.id, // ✅ DB primary key required
        doctorName: null,
        prescriptions: '',
        diagnosis: '',
        action: ''
      };

      setPatients(prev => [...prev, newPatient]);

      // ✅ Add timeline entry using DB ID (after patient is saved)
      await fetch("http://192.168.230.128:5000/api/patients/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_db_id: newPatient.id,
          action: 'Registered',
          performed_by: currentUser.name || currentUser.username
        })
      });

      Alert.alert(
        "✅ Patient Registered Successfully!",
        `🆔 Patient ID: ${generatedPatientId}`,
        [
          {
            text: "OK",
            onPress: () => {
              setErForm({
                name: '',
                age: '',
                symptoms: 'Fever',
                condition: '',
                hasInsurance: 'no',
                insuranceProvider: '',
                policyNumber: '',
                emergencyContact: '',
                otherInsuranceProvider: ''
              });
            }
          }
        ],
        { cancelable: false }
      );
    } else {
      throw new Error(data.error || "Something went wrong");
    }

  } catch (error) {
    console.error("❌ Patient registration failed:", error.message);
    Toast.show({
      type: 'error',
      text1: 'Registration Failed',
      text2: error.message,
      position: 'top'
    });
  }
};





  // Diagnosis form submission
const handleDiagnosisSubmit = async () => {
  if (!diagnosisForm.notes) {
    showAlert('Error', 'Please enter diagnosis notes', false);
    return;
  }

  // ✅ Step 1: Build safe update body for backend
  const body = {
    diagnosis: diagnosisForm.notes,
    observations: diagnosisForm.observations,
    status: 'Diagnosed',
    doctor_name: currentUser.name || currentUser.username
  };

  // ✅ Preserve existing prescription/discharge info if already filled
  if (selectedPatient?.prescriptions) {
    body.prescriptions = selectedPatient.prescriptions;
  }

  if (selectedPatient?.dischargeDate) {
    body.discharge_date = selectedPatient.dischargeDate;
  }

  console.log("📤 Sending diagnosis update:", body);

  try {
    // ✅ Step 2: Send update to patients table
    await fetch(`http://192.168.230.128:5000/api/patients/${selectedPatient.patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // ✅ Step 3: Post to timeline table
    await fetch("http://192.168.230.128:5000/api/patients/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_db_id: selectedPatient.id, // DB primary key
        action: 'Diagnosed',
        performed_by: currentUser.name || currentUser.username,
        notes: diagnosisForm.notes
      })
    });

    // ✅ Step 4: Create Notification on backend
    await createNotificationOnBackend(
      `Diagnosis completed for patient ${selectedPatient.name}`,
      selectedPatient.patientId
    );

    // ✅ Step 5: Update frontend state
    const updatedPatients = patients.map(p =>
      p.patientId === selectedPatient.patientId
        ? {
            ...p,
            diagnosis: diagnosisForm.notes,
            observations: diagnosisForm.observations,
            status: 'Diagnosed',
            doctorName: currentUser.name || currentUser.username,
            tempUpdated: Date.now()
          }
        : p
    );

    updatedPatients.sort((a, b) => (a.tempUpdated || 0) - (b.tempUpdated || 0));
    setPatients(updatedPatients);

    // ✅ Step 6: UI feedback and cleanup
    setDiagnosisForm({ notes: '', observations: '' });

    const newNotification = {
      id: Date.now(),
      message: `Diagnosis completed for patient ${selectedPatient.name}`,
      timestamp: new Date().toISOString(),
      patientId: selectedPatient.patientId
    };

    setNotifications([...notifications, newNotification]);
    setSelectedPatient(null);
    showAlert('Success', 'Diagnosis saved successfully');
    setActiveScreen('doctorDashboard');
  } catch (err) {
    console.error("❌ Diagnosis submission failed:", err.message);
    showAlert('Error', 'Failed to save diagnosis. Please try again.');
  }
};


  // Prescription form submission
const handlePrescriptionSubmit = async () => {
  if (!prescriptionForm.meds) {
    showAlert('Error', 'Please enter medications', false);
    return;
  }

  // ✅ Step 1: Format full prescription
  const fullPrescription = prescriptionForm.meds +
    (prescriptionForm.tests ? `\nTests: ${prescriptionForm.tests}` : '');

  // ✅ Step 2: Preserve previous diagnosis/observations
  const prevDiagnosis = selectedPatient.diagnosis;
  const prevObservations = selectedPatient.observations;

  try {
    // ✅ Step 3: Update patient record in DB
    await fetch(`http://192.168.230.128:5000/api/patients/${selectedPatient.patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prescriptions: fullPrescription,
        status: 'Prescribed',
        doctor_name: currentUser.name || currentUser.username,
        diagnosis: prevDiagnosis || null,
        observations: prevObservations || null
      })
    });

    // ✅ Step 4: Add to timeline
    await fetch("http://192.168.230.128:5000/api/patients/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_db_id: selectedPatient.id, // actual DB ID
        action: 'Prescribed',
        performed_by: currentUser.name || currentUser.username,
        medications: prescriptionForm.meds,
        tests: prescriptionForm.tests
      })
    });

    await createNotificationOnBackend(`Prescription added for patient ${selectedPatient.name}`, selectedPatient.patientId);


    // ✅ Step 5: Update frontend state (optional but helpful)
    const updatedPatients = patients.map(p =>
      p.patientId === selectedPatient.patientId
        ? {
            ...p,
            prescriptions: fullPrescription,
            status: 'Prescribed',
            doctorName: currentUser.name || currentUser.username,
            tempUpdated: Date.now()
          }
        : p
    );

    updatedPatients.sort((a, b) => (a.tempUpdated || 0) - (b.tempUpdated || 0));
    setPatients(updatedPatients);

    // ✅ Step 6: Reset UI
    setPrescriptionForm({ meds: '', tests: '' });

    const newNotification = {
      id: Date.now(),
      message: `Prescription created for patient ${selectedPatient.name}`,
      timestamp: new Date().toISOString(),
      patientId: selectedPatient.patientId
    };

    setNotifications([...notifications, newNotification]);
    setSelectedPatient(null);
    showAlert('Success', 'Prescription saved successfully');
    setActiveScreen('doctorDashboard');

  } catch (err) {
    console.error("❌ Prescription save failed:", err.message);
    showAlert('Error', 'Failed to save prescription. Please try again.');
  }
};




  // Action form submission with undo functionality
  const handleActionSubmit = async () => {
  const action = actionForm.action;

  // ✅ Step 1: Preserve previous values
  const prevDiagnosis = selectedPatient.diagnosis;
  const prevObservations = selectedPatient.observations;
  const prevPrescriptions = selectedPatient.prescriptions;

  // ✅ Step 2: Determine specialist (if applicable)
  const specialistName =
    action === 'Refer to Specialist'
      ? specialistMapping[selectedPatient.symptoms] || 'Specialist'
      : null;

  try {
    // ✅ Step 3: Update patient record in database
    await fetch(`http://192.168.230.128:5000/api/patients/${selectedPatient.patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        status: action,
        doctor_name: currentUser.name || currentUser.username,
        discharge_date: action === 'Discharge' ? new Date().toISOString() : null,
        diagnosis: prevDiagnosis || null,
        observations: prevObservations || null,
        prescriptions: prevPrescriptions || null
      })
    });

    await createNotificationOnBackend(`Action taken for patient ${selectedPatient.name}`, selectedPatient.patientId);


    // ✅ Step 4: Build timeline payload WITHOUT sending nulls
    const timelinePayload = {
      patient_db_id: selectedPatient.id,
      action: action,
      performed_by: currentUser.name || currentUser.username
    };

    if (specialistName) {
      timelinePayload.specialist = specialistName;
    }

    // ✅ Step 5: Add to timeline (backend will merge all previous fields)
    await fetch("http://192.168.230.128:5000/api/patients/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(timelinePayload)
    });

    // ✅ Step 6: Update local patient state
    const updatedPatients = patients.map(p =>
      p.patientId === selectedPatient.patientId
        ? {
            ...p,
            action: action,
            status: action,
            dischargeDate: action === 'Discharge' ? new Date().toISOString() : null,
            doctorName: currentUser.name || currentUser.username,
            tempUpdated: Date.now()
          }
        : p
    );

    updatedPatients.sort((a, b) => (a.tempUpdated || 0) - (b.tempUpdated || 0));
    setPatients(updatedPatients);

    // ✅ Step 7: Store undo action
    setLastAction({
      previousPatients: patients,
      patientId: selectedPatient.id,
      action: action
    });

    setActionForm({ action: 'Discharge' });

    Toast.show({
      type: 'info',
      text1: `Patient marked as ${action}`,
      text2: 'Tap to undo this action',
      position: 'bottom',
      visibilityTime: 10000,
      onPress: handleUndoAction
    });

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    undoTimeoutRef.current = setTimeout(() => {
      setLastAction(null);
    }, 10000);

    // ✅ Step 8: Notify and return to dashboard
    const newNotification = {
      id: Date.now(),
      message: `Patient ${selectedPatient.name} marked as ${action}`,
      timestamp: new Date().toISOString(),
      patientId: selectedPatient.patientId
    };

    setNotifications([...notifications, newNotification]);
    setSelectedPatient(null);
    setActiveScreen('doctorDashboard');

  } catch (err) {
    console.error("❌ Action submit failed:", err.message);
    showAlert('Error', 'Failed to perform patient action. Please try again.');
  }
};


  // Undo the last action
  const handleUndoAction = () => {
  if (lastAction) {
    setPatients(lastAction.previousPatients);
    setLastAction(null);
    Toast.hide();
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  }
};


  // Generate PDF for patient
  const generatePatientPDF = async (patient) => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
              h1 { color: #1976d2; margin-bottom: 5px; }
              .hospital-name { font-size: 18px; font-weight: bold; color: #555; margin-bottom: 10px; }
              .hospital-address { font-size: 14px; color: #777; margin-bottom: 20px; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; font-weight: bold; color: #1976d2; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
              .patient-info { margin-bottom: 20px; }
              .info-row { display: flex; margin-bottom: 8px; }
              .info-label { width: 180px; font-weight: bold; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: right; }
              .signature { margin-top: 50px; }
              .signature-line { border-top: 1px solid #333; width: 200px; margin-top: 40px; }
              .signature-text { margin-top: 5px; font-size: 14px; }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-30deg);
                font-size: 120px;
                color: #1976d2;
                opacity: 0.1;
                z-index: 0;
                white-space: nowrap;
                pointer-events: none;
              }
              .timeline { margin-top: 20px; }
              .timeline-item { margin-bottom: 15px; padding-left: 20px; border-left: 2px solid #1976d2; }
              .timeline-action { font-weight: bold; color: #1976d2; }
              .timeline-time { font-size: 12px; color: #666; }
              .timeline-by { font-size: 12px; color: #666; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PATIENT MEDICAL REPORT</h1>
              <div class="hospital-name">CITY GENERAL HOSPITAL</div>
              <div class="hospital-address">123 Medical Drive, Cityville, ST 12345</div>
            </div>
            
            <div class="section">
              <div class="section-title">PATIENT INFORMATION</div>
              <div class="info-row">
                <div class="info-label">Patient ID:</div>
                <div>${patient.patientId}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Full Name:</div>
                <div>${patient.name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Age:</div>
                <div>${patient.age}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Registration Date:</div>
                <div>${new Date(patient.registrationDate).toLocaleString()}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Status:</div>
                <div>${patient.status}</div>
              </div>
              ${patient.doctorName ? `
              <div class="info-row">
                <div class="info-label">Attending Doctor:</div>
                <div>${patient.doctorName}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="section">
              <div class="section-title">MEDICAL DETAILS</div>
              <div class="info-row">
                <div class="info-label">Presenting Symptoms:</div>
                <div>${patient.symptoms}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Condition:</div>
                <div>${patient.condition}</div>
              </div>
              ${patient.diagnosis ? `
              <div class="info-row">
                <div class="info-label">Diagnosis:</div>
                <div>${patient.diagnosis}</div>
              </div>
              ` : ''}
              ${patient.observations ? `
              <div class="info-row">
                <div class="info-label">Clinical Observations:</div>
                <div>${patient.observations}</div>
              </div>
              ` : ''}
              ${patient.prescriptions ? `
              <div class="info-row">
                <div class="info-label">Prescribed Treatment:</div>
                <div>${patient.prescriptions.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}
              ${patient.action ? `
              <div class="info-row">
                <div class="info-label">Action Taken:</div>
                <div>${patient.action}</div>
              </div>
              ` : ''}
            </div>
            
            ${patient.hasInsurance === 'yes' ? `
            <div class="section">
              <div class="section-title">INSURANCE INFORMATION</div>
              <div class="info-row">
                <div class="info-label">Provider:</div>
                <div>${patient.insuranceProvider}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Policy Number:</div>
                <div>${patient.policyNumber}</div>
              </div>
            </div>
            ` : ''}
            
            <div class="footer">
              <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-text">${currentUser.name || currentUser.username}</div>
                <div class="signature-text">${new Date().toLocaleDateString()}</div>
              </div>
              <div style="margin-top: 20px; font-size: 12px; color: #777;">
                Document generated on ${new Date().toLocaleString()}
              </div>
            </div>
            
            <div class="watermark">Medical Report</div>
          </body>
        </html>
      `;

      // Helper function to get timeline icons
      function getTimelineIcon(action) {
        switch(action) {
          case 'Registered': return '📅';
          case 'Diagnosed': return '🩺';
          case 'Prescribed': return '💊';
          case 'Discharge': return '✅';
          case 'Admit to Ward': return '🏥';
          case 'Transfer to ICU': return '🚑';
          case 'Refer to Specialist': return '👨‍⚕️';
          default: return '•';
        }
      }

      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 595,
        height: 842,
        padding: {
          top: 30,
          right: 30,
          bottom: 30,
          left: 30
        }
      });

      const dir = `${FileSystem.documentDirectory}PatientReports`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      const filename = `PatientReport_${patient.patientId}_${Date.now()}.pdf`;
      const newPath = `${dir}/${filename}`;

      await FileSystem.moveAsync({
      from: uri,
      to: newPath
    });

        // ✅ Now share separately AFTER file is fully saved
    setTimeout(() => {
      shareAsync(newPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share or Save Patient Report',
        UTI: 'com.adobe.pdf',
      });
    }, 500);  // slight delay to avoid race condition

      setShowPdfCelebration(true);
setTimeout(() => setShowPdfCelebration(false), 3000);


    } catch (error) {
      showAlert('Error', 'Failed to generate PDF', false);
      console.error(error);
    }
  };

  // Render timeline for a patient
  const renderTimeline = (patient) => {
  const timeline = patient.timeline || [];
  if (timeline.length === 0) return null;

  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.timelineTitle}>Patient Timeline</Text>
      {timeline.map((item, index) => (
        <View key={index} style={styles.timelineItem}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineContent}>
            <Text style={styles.timelineAction}>
              {getTimelineIcon(item.action)} {item.action}
            </Text>
            <Text style={styles.timelineTime}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.timelineBy}>By: {item.performed_by}</Text>
            {item.notes && <Text style={styles.timelineNotes}>Notes: {item.notes}</Text>}
            {item.medications && <Text style={styles.timelineNotes}>Medications: {item.medications}</Text>}
            {item.tests && <Text style={styles.timelineNotes}>Tests: {item.tests}</Text>}
            {item.specialist && <Text style={styles.timelineNotes}>Referred to: {item.specialist}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
};


  // Helper function to get timeline icons
  const getTimelineIcon = (action) => {
    switch(action) {
      case 'Registered': return '📅';
      case 'Diagnosed': return '🩺';
      case 'Prescribed': return '💊';
      case 'Discharge': return '✅';
      case 'Admit to Ward': return '🏥';
      case 'Transfer to ICU': return '🚑';
      case 'Refer to Specialist': return '👨‍⚕️';
      default: return '•';
    }
  };

  // Load data from storage on app start
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedPatients = await AsyncStorage.getItem('patients');
        const savedUsers = await AsyncStorage.getItem('users');
        const savedNotifications = await AsyncStorage.getItem('notifications');
        
        if (savedPatients) setPatients(JSON.parse(savedPatients));
        if (savedUsers) setUsers(JSON.parse(savedUsers));
        if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
      } catch (error) {
        console.error('Failed to load data', error);
      }
    };
    
    loadData();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem('patients', JSON.stringify(patients));
        await AsyncStorage.setItem('users', JSON.stringify(users));
        await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      } catch (error) {
        console.error('Failed to save data', error);
      }
    };
    
    if (loggedIn) saveData();
  }, [patients, users, notifications, loggedIn]);

  // Render functions for different screens
 const renderLogin = () => (
  <ImageBackground 
    source={require('./assets/hospital.jpeg')}
    style={styles.loginBackground}
    blurRadius={3}
  >
    <View style={styles.loginContainer}>
      <Animated.View style={[styles.loginBox, { transform: [{ translateX: shakeAnim }] }]}>
        <Text style={styles.loginTitle}>Emergency Room System</Text>
        
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🏥</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.loginInput}
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.loginInput, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialIcons 
                name={showPassword ? 'visibility-off' : 'visibility'} 
                size={24} 
                color="#999" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rememberMeContainer}>
          <CheckBox
            value={rememberMe}
            onValueChange={setRememberMe}
            style={styles.checkbox}
          />
          <Text style={styles.rememberMeText}>Remember Me</Text>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.gradientButton}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Error animation overlay */}
      {showLoginErrorAnim && (
        <View style={styles.fullscreenCelebration}>
          <LottieView
            source={require('./assets/login_error.json')}
            autoPlay
            loop={false}
            style={{ width: 200, height: 200 }}
          />
        </View>
      )}
    </View>
  </ImageBackground>
);


  const renderErForm = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <View style={styles.formCard}>
        <View style={{ alignItems: 'flex-end', paddingRight: 5 }}>
  <TouchableOpacity onPress={() => setActiveScreen('profile')}>
    <MaterialIcons name="account-circle" size={50} color="#1976d2" />
  </TouchableOpacity>
</View>

<View style={styles.welcomeBanner}>
  <Text style={styles.welcomeGreeting}>
    👋 Welcome {currentUser?.role === 'Doctor' ? 'Dr.' : 'Nurse'}
  </Text>
  <Text style={styles.welcomeName}>
    {currentUser?.name || currentUser?.username}
  </Text>
</View>


        <Text
  style={{
    fontSize: 22,               // ✅ starting size
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 15,
    width: '100%',
  }}
  numberOfLines={1}
  adjustsFontSizeToFit={true}
>
  Emergency Patient Registration
</Text>

        <Text style={styles.patientId}>Patient ID: {currentPatientId}</Text>

        <TouchableOpacity 
  style={styles.handwritingButton} 
  onPress={startHandwritingInput}
>
  <LinearGradient
    colors={['#FF9800', '#F57C00']}
    style={styles.gradientButton}
  >
    <Text style={styles.buttonText}>✍️ Write Patient Details</Text>
  </LinearGradient>
</TouchableOpacity>

        
        <View style={styles.inputGroup}>
  <Text style={styles.label}>Patient Name*</Text>
  <TextInput
    style={[
      styles.formInput,
      erFormErrors.name && { borderColor: 'red', borderWidth: 1 }
    ]}
    placeholder="Enter patient name"
    value={erForm.name}
    onChangeText={text => {
      setErForm({ ...erForm, name: text });
      if (erFormErrors.name) {
        setErFormErrors(prev => ({ ...prev, name: undefined }));
      }
    }}
  />
  {erFormErrors.name && <Text style={styles.errorText}>{erFormErrors.name}</Text>}
</View>

        
        <View style={styles.inputGroup}>
  <Text style={styles.label}>Age*</Text>
  <TextInput
    style={[
      styles.formInput,
      erFormErrors.age && { borderColor: 'red', borderWidth: 1 }
    ]}
    placeholder="Enter age"
    value={erForm.age}
    onChangeText={text => {
      setErForm({ ...erForm, age: text });
      if (erFormErrors.age) {
        setErFormErrors(prev => ({ ...prev, age: undefined }));
      }
    }}
    keyboardType="numeric"
  />
  {erFormErrors.age && <Text style={styles.errorText}>{erFormErrors.age}</Text>}
</View>

        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Symptoms*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={erForm.symptoms}
              onValueChange={itemValue => setErForm({...erForm, symptoms: itemValue})}
              style={styles.formPicker}
            >
              {symptomsList.map((symptom, index) => (
                <Picker.Item key={index} label={symptom} value={symptom} />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.inputGroup}>
  <Text style={styles.label}>Condition*</Text>
  <TouchableOpacity
    style={[
      styles.conditionPickerButton,
      erFormErrors.condition && { borderColor: 'red', borderWidth: 1 }
    ]}
    onPress={() => setShowConditionPicker(true)}
    activeOpacity={0.8}
  >
    <View style={styles.conditionDisplay}>
      <View style={[
        styles.conditionDot,
        erForm.condition === 'red' && { backgroundColor: 'red' },
        erForm.condition === 'yellow' && { backgroundColor: 'gold' },
        erForm.condition === 'blue' && { backgroundColor: 'blue' },
        !erForm.condition && { backgroundColor: 'gray' }
      ]} />
      <Text style={styles.conditionText}>
        {erForm.condition === 'red' && 'Red - Emergency (Nurse → Doctor)'}
        {erForm.condition === 'yellow' && 'Yellow - Mild Emergency (Self → Nurse/Doctor)'}
        {erForm.condition === 'blue' && 'Blue - Vacant (Can be used if required)'}
        {!erForm.condition && 'Select Condition'}
      </Text>
    </View>
  </TouchableOpacity>
  {erFormErrors.condition && (
    <Text style={styles.errorText}>{erFormErrors.condition}</Text>
  )}
</View>



        
        <View style={styles.inputGroup}>
  <Text style={styles.label}>Emergency Contact*</Text>
  <TextInput
    style={[
      styles.formInput,
      erFormErrors.emergencyContact && { borderColor: 'red', borderWidth: 1 }
    ]}
    placeholder="Emergency contact number"
    value={erForm.emergencyContact}
    onChangeText={text => {
      setErForm({ ...erForm, emergencyContact: text });
      if (erFormErrors.emergencyContact) {
        setErFormErrors(prev => ({ ...prev, emergencyContact: undefined }));
      }
    }}
    keyboardType="phone-pad"
  />
  {erFormErrors.emergencyContact && (
    <Text style={styles.errorText}>{erFormErrors.emergencyContact}</Text>
  )}
</View>

        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Has Insurance?*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={erForm.hasInsurance}
              onValueChange={itemValue => setErForm({...erForm, hasInsurance: itemValue})}
              style={styles.formPicker}
            >
              <Picker.Item label="No" value="no" />
              <Picker.Item label="Yes" value="yes" />
            </Picker>
          </View>
        </View>
        
        {erForm.hasInsurance === 'yes' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Insurance Provider*</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={erForm.insuranceProvider}
                  onValueChange={itemValue => setErForm({...erForm, insuranceProvider: itemValue})}
                  style={styles.formPicker}
                >
                  {insuranceProviders.map((provider, index) => (
                    <Picker.Item key={index} label={provider} value={provider} />
                  ))}
                </Picker>
              </View>
            </View>
            
            {erForm.insuranceProvider === 'Other (Please specify)' && (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>Company Name*</Text>
    <TextInput
      style={[
        styles.formInput,
        erFormErrors.otherInsuranceProvider && { borderColor: 'red', borderWidth: 1 }
      ]}
      placeholder="Enter insurance company name"
      value={erForm.otherInsuranceProvider}
      onChangeText={text => {
        setErForm({ ...erForm, otherInsuranceProvider: text });
        if (erFormErrors.otherInsuranceProvider) {
          setErFormErrors(prev => ({ ...prev, otherInsuranceProvider: undefined }));
        }
      }}
    />
    {erFormErrors.otherInsuranceProvider && (
      <Text style={styles.errorText}>{erFormErrors.otherInsuranceProvider}</Text>
    )}
  </View>
)}

            
            <View style={styles.inputGroup}>
  <Text style={styles.label}>Policy Number*</Text>
  <TextInput
    style={[
      styles.formInput,
      erFormErrors.policyNumber && { borderColor: 'red', borderWidth: 1 }
    ]}
    placeholder="Insurance policy number"
    value={erForm.policyNumber}
    onChangeText={text => {
      setErForm({ ...erForm, policyNumber: text });
      if (erFormErrors.policyNumber) {
        setErFormErrors(prev => ({ ...prev, policyNumber: undefined }));
      }
    }}
  />
  {erFormErrors.policyNumber && (
    <Text style={styles.errorText}>{erFormErrors.policyNumber}</Text>
  )}
</View>

          </>
        )}
        
        <TouchableOpacity 
  style={styles.primaryButton} 
  onPress={handleErFormSubmit}
>
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Register Emergency Patient</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
        >
          <LinearGradient
            colors={['#f44336', '#d32f2f', '#b71c1c']}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderDoctorDashboard = () => (
    <ImageBackground 
      source={require('./assets/OIP.jpeg')}
      style={styles.dashboardBackground}
      blurRadius={2}
    >
      <ScrollView contentContainerStyle={styles.dashboardScrollContainer}>
        <View style={styles.dashboardCard}>
          <View style={{ alignItems: 'flex-end', paddingRight: 15 }}>
  <TouchableOpacity onPress={() => setActiveScreen('profile')}>

    <MaterialIcons name="account-circle" size={50} color="#1976d2" />
  </TouchableOpacity>
</View>

          <Text style={styles.dashboardTitle}>Doctor Dashboard</Text>
          <View style={styles.welcomeBanner}>
  <Text style={styles.welcomeGreeting}>
    👋 Welcome {currentUser.role === 'Doctor' ? 'Dr.' : 'Nurse'}
  </Text>
  <Text style={styles.welcomeName}>
    {currentUser.name || currentUser.username}
  </Text>
</View>

          
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{patients.length}</Text>
              <Text style={styles.statLabel}>Total Patients</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{patients.filter(p => p.status === 'Diagnosed').length}</Text>
              <Text style={styles.statLabel}>Diagnosed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{patients.filter(p => p.status === 'Prescribed').length}</Text>
              <Text style={styles.statLabel}>Prescribed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{patients.filter(p => p.status === 'Discharge').length}</Text>
              <Text style={styles.statLabel}>Discharged</Text>
            </View>
          </View>
          
          <View style={styles.dashboardButtonGroup}>
            <TouchableOpacity 
              style={styles.dashboardButton}
              onPress={() => {
  fetchPatientsFromBackend(); // <-- refresh patients
  setModalContent('diagnosisList');
  setShowModal(true);
}}
>
              <LinearGradient
                colors={['#4CAF50', '#2E7D32']}
                style={styles.gradientButton}
              >
                <Text style={styles.dashboardButtonText}>Patients for Diagnosis</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dashboardButton}
              onPress={() => {
    fetchPatientsFromBackend(); // ✅ refresh
    setModalContent('prescriptionList');
    setShowModal(true);
  }}>
              <LinearGradient
                colors={['#2196F3', '#1565C0']}
                style={styles.gradientButton}
              >
                <Text style={styles.dashboardButtonText}>Patients for Prescription</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dashboardButton}
               onPress={() => {
    fetchPatientsFromBackend(); // ✅ refresh
    setModalContent('actionList');
    setShowModal(true);
  }}>
              <LinearGradient
                colors={['#FF9800', '#EF6C00']}
                style={styles.gradientButton}
              >
                <Text style={styles.dashboardButtonText}>Patients for Action</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dashboardButton}
              onPress={() => {
    fetchPatientsFromBackend(); // ✅ refresh
    setModalContent('allPatients');
    setShowModal(true);
  }}>
              <LinearGradient
                colors={['#9C27B0', '#6A1B9A']}
                style={styles.gradientButton}
              >
                                <Text style={styles.dashboardButtonText}>View All Patients</Text>
              </LinearGradient>
      

            </TouchableOpacity>
          </View>
          
          
          <TouchableOpacity 
  style={styles.notificationButton}
  onPress={() => {
    setModalContent('notifications');
    setShowModal(true);
  }}
>
  {notifications.length > 0 && (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
    </View>
  )}
  <Text style={styles.notificationButtonText}>View Notifications</Text>
</TouchableOpacity>

          
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <LinearGradient
              colors={['#f44336', '#d32f2f', '#b71c1c']}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );

const renderProfilePage = () => (
  <ImageBackground 
    source={require('./assets/hospital.jpeg')}
    style={styles.dashboardBackground} 
    blurRadius={3}
  >
    <View style={styles.centeredProfileContainer}>
      <View style={styles.profileCard}>
        {/* Profile Title */}
        <View style={styles.profileHeader}>
          <MaterialIcons name="account-circle" size={28} color="#1976d2" />
          <Text style={styles.profileTitle}>My Profile</Text>
        </View>

        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <MaterialIcons name="account-circle" size={100} color="#1976d2" />
        </View>

        {/* User Info Rows */}
        <View style={styles.profileInfoRow}>
          <Text style={styles.detailLabel}>Username:</Text>
          <Text style={styles.detailValue}>{currentUser?.username}</Text>
        </View>

        <View style={styles.profileInfoRow}>
          <Text style={styles.detailLabel}>Role:</Text>
          <Text style={styles.detailValue}>{currentUser?.role}</Text>
        </View>

        {currentUser?.name && (
          <View style={styles.profileInfoRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{currentUser.name}</Text>
          </View>
        )}

        {/* Back Button */}
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => setActiveScreen(currentUser?.role === 'Doctor' ? 'doctorDashboard' : 'erForm')}
        >
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </ImageBackground>
);

<Modal
  transparent
  visible={showConditionPicker}
  animationType="fade"
  onRequestClose={() => setShowConditionPicker(false)}
>
  <TouchableOpacity
    style={styles.modalOverlay}
    activeOpacity={1}
    onPress={() => setShowConditionPicker(false)}
  >
    <View style={styles.modalPicker}>
      {[
        {
          value: 'red',
          label: 'Red - Critical Emergency (Nurse → Doctor)',
          color: 'red',
        },
        {
          value: 'yellow',
          label: 'Yellow - Moderate Emergency (Self → Nurse/Doctor)',
          color: 'gold',
        },
        {
          value: 'blue',
          label: 'Blue - Non-Urgent (Can be used if required)',
          color: 'blue',
        },
      ].map((option, index, arr) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.modalOption,
            index === arr.length - 1 && { borderBottomWidth: 0 }, // remove bottom border for last item
          ]}
          onPress={() => {
            setErForm({ ...erForm, condition: option.value });
            setShowConditionPicker(false);
            setErFormErrors((prev) => ({ ...prev, condition: undefined }));
          }}
        >
          <View
            style={[styles.conditionDot, { backgroundColor: option.color }]}
          />
          <Text style={styles.conditionOptionText}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </TouchableOpacity>
</Modal>





  const renderDiagnosisForm = () => (
  <ScrollView contentContainerStyle={styles.formContainer}>
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Patient Diagnosis</Text>

      <Text style={styles.patientInfo}>Patient: {selectedPatient?.name || 'N/A'}</Text>
      <Text style={styles.patientInfo}>ID: {selectedPatient?.patientId || 'N/A'}</Text>
      <Text style={styles.patientInfo}>Symptoms: {selectedPatient?.symptoms || 'N/A'}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Diagnosis Notes*</Text>
        <TextInput
          style={[styles.formInput, { height: 120, textAlignVertical: 'top' }]}
          placeholder="Enter diagnosis details"
          value={diagnosisForm.notes}
          onChangeText={text =>
            setDiagnosisForm({ ...diagnosisForm, notes: text })
          }
          multiline
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Clinical Observations</Text>
        <TextInput
          style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Enter clinical observations"
          value={diagnosisForm.observations}
          onChangeText={text =>
            setDiagnosisForm({ ...diagnosisForm, observations: text })
          }
          multiline
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleDiagnosisSubmit}
        disabled={!diagnosisForm.notes} // required
      >
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.gradientButton}
        >
          <Text style={styles.buttonText}>Save Diagnosis</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setSelectedPatient(null);
          setActiveScreen('doctorDashboard');
        }}
      >
        <Text style={styles.secondaryButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

  const renderPrescriptionForm = () => (
  <ScrollView contentContainerStyle={styles.formContainer}>
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Patient Prescription</Text>

      <Text style={styles.patientInfo}>Patient: {selectedPatient?.name || 'N/A'}</Text>
      <Text style={styles.patientInfo}>ID: {selectedPatient?.patientId || 'N/A'}</Text>
      <Text style={styles.patientInfo}>Diagnosis: {selectedPatient?.diagnosis || 'N/A'}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Medications*</Text>
        <TextInput
          style={[styles.formInput, { height: 120, textAlignVertical: 'top' }]}
          placeholder="Enter prescribed medications"
          value={prescriptionForm.meds}
          onChangeText={text =>
            setPrescriptionForm({ ...prescriptionForm, meds: text })
          }
          multiline
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tests Required</Text>
        <TextInput
          style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Enter any required tests"
          value={prescriptionForm.tests}
          onChangeText={text =>
            setPrescriptionForm({ ...prescriptionForm, tests: text })
          }
          multiline
        />
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handlePrescriptionSubmit}
        disabled={!prescriptionForm.meds}
      >
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.gradientButton}
        >
          <Text style={styles.buttonText}>Save Prescription</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setSelectedPatient(null);
          setActiveScreen('doctorDashboard');
        }}
      >
        <Text style={styles.secondaryButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

  const renderActionForm = () => (
  <ScrollView contentContainerStyle={styles.formContainer}>
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Patient Action</Text>
      <Text style={styles.patientInfo}>Patient: {selectedPatient?.name}</Text>
      <Text style={styles.patientInfo}>ID: {selectedPatient?.patientId}</Text>
      <Text style={styles.patientInfo}>Diagnosis: {selectedPatient?.diagnosis || 'N/A'}</Text>
      <Text style={styles.patientInfo}>Prescription: {selectedPatient?.prescriptions || 'N/A'}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Select Action*</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={actionForm.action}
            onValueChange={(itemValue) => setActionForm({ action: itemValue })}
            style={styles.formPicker}
          >
            <Picker.Item label="Discharge" value="Discharge" />
            <Picker.Item label="Admit to Ward" value="Admit to Ward" />
            <Picker.Item label="Transfer to ICU" value="Transfer to ICU" />
            <Picker.Item label="Refer to Specialist" value="Refer to Specialist" />
          </Picker>
        </View>
      </View>

      {actionForm.action === 'Refer to Specialist' && (
        <View style={styles.specialistContainer}>
          <Text style={styles.specialistText}>
            Recommended Specialist: {specialistMapping[selectedPatient?.symptoms] || 'General Specialist'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleActionSubmit}
      >
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.gradientButton}
        >
          <Text style={styles.buttonText}>Confirm Action</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          setSelectedPatient(null);
          setActiveScreen('doctorDashboard');
        }}
      >
        <Text style={styles.secondaryButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);


  const renderPatientDetails = () => (
    <ScrollView contentContainerStyle={styles.formContainer}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Patient Details</Text>
        
        <View style={styles.patientDetailsRow}>
          <Text style={styles.detailLabel}>Name:</Text>
          <Text style={styles.detailValue}>{selectedPatient.name}</Text>
        </View>
        
        <View style={styles.patientDetailsRow}>
          <Text style={styles.detailLabel}>Patient ID:</Text>
          <Text style={styles.detailValue}>{selectedPatient.patientId}</Text>
        </View>
        
        <View style={styles.patientDetailsRow}>
          <Text style={styles.detailLabel}>Age:</Text>
          <Text style={styles.detailValue}>{selectedPatient.age}</Text>
        </View>
        
        <View style={styles.patientDetailsRow}>
          <Text style={styles.detailLabel}>Symptoms:</Text>
          <Text style={styles.detailValue}>{selectedPatient.symptoms}</Text>
        </View>
        
        <View style={styles.patientDetailsRow}>
          <Text style={styles.detailLabel}>Condition:</Text>
          <Text style={styles.detailValue}>{selectedPatient.condition}</Text>
        </View>
        
        <View style={styles.patientDetailsRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, 
            { color: getStatusColor(selectedPatient.status) }]}>
            {selectedPatient.status}
          </Text>
        </View>
        
        {selectedPatient.diagnosis && (
          <View style={styles.patientDetailsRow}>
            <Text style={styles.detailLabel}>Diagnosis:</Text>
            <Text style={styles.detailValue}>{selectedPatient.diagnosis}</Text>
          </View>
        )}
        
        {selectedPatient.observations && (
          <View style={styles.patientDetailsRow}>
            <Text style={styles.detailLabel}>Observations:</Text>
            <Text style={styles.detailValue}>{selectedPatient.observations}</Text>
          </View>
        )}
        
        {selectedPatient.prescriptions && (
          <View style={styles.patientDetailsRow}>
            <Text style={styles.detailLabel}>Prescriptions:</Text>
            <Text style={styles.detailValue}>{selectedPatient.prescriptions}</Text>
          </View>
        )}
        
        {selectedPatient.action && (
          <View style={styles.patientDetailsRow}>
            <Text style={styles.detailLabel}>Action:</Text>
            <Text style={styles.detailValue}>{selectedPatient.action}</Text>
          </View>
        )}
        
        {selectedPatient.doctorName && (
          <View style={styles.patientDetailsRow}>
            <Text style={styles.detailLabel}>Attending Doctor:</Text>
            <Text style={styles.detailValue}>{selectedPatient.doctorName}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => generatePatientPDF(selectedPatient)}
        >
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>Generate PDF Report</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.timelineButton}
          onPress={() => setShowTimeline(!showTimeline)}
        >
          <Text style={styles.timelineButtonText}>
            {showTimeline ? 'Hide Timeline' : 'View Timeline'}
          </Text>
        </TouchableOpacity>
        
        {showTimeline && renderTimeline(selectedPatient)}
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => {
            setSelectedPatient(null);
            setActiveScreen('doctorDashboard');
          }}
        >
          <Text style={styles.secondaryButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'Registered': return '#2196F3';
      case 'Diagnosed': return '#4CAF50';
      case 'Prescribed': return '#FF9800';
      case 'Discharge': return '#9C27B0';
      case 'Admit to Ward': return '#607D8B';
      case 'Transfer to ICU': return '#F44336';
      case 'Refer to Specialist': return '#009688';
      default: return '#000';
    }
  };

  const renderModalContent = () => {
    switch(modalContent) {
      case 'diagnosisList':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Patients Needing Diagnosis</Text>
            <FlatList
              data={patients.filter(p => p.status === 'Registered')}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.patientItem}
                  onPress={() => {
                    setSelectedPatient(item);
                    setShowModal(false);
                    setActiveScreen('diagnosisForm');
                  }}
                >
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.patientIdText}>ID: {item.patientId}</Text>
                  <Text style={styles.patientSymptoms}>Symptoms: {item.symptoms}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>No patients needing diagnosis</Text>
              }
            />
          </View>
        );
      
      case 'prescriptionList':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Patients Needing Prescription</Text>
            <FlatList
              data={patients.filter(p => p.status === 'Diagnosed')}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.patientItem}
                  onPress={() => {
                    setSelectedPatient(item);
                    setShowModal(false);
                    setActiveScreen('prescriptionForm');
                  }}
                >
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.patientIdText}>ID: {item.patientId}</Text>
                  <Text style={styles.patientDiagnosis}>Diagnosis: {item.diagnosis}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>No patients needing prescription</Text>
              }
            />
          </View>
        );
      
      case 'actionList':
        return (
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Patients Needing Action</Text>
            <FlatList
              data={patients.filter(p => p.status === 'Prescribed')}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.patientItem}
                  onPress={() => {
                    setSelectedPatient(item);
                    setShowModal(false);
                    setActiveScreen('actionForm');
                  }}
                >
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.patientIdText}>ID: {item.patientId}</Text>
                  <Text style={styles.patientPrescription}>Prescription: {item.prescriptions}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>No patients needing action</Text>
              }
            />
          </View>
        );
      
      case 'allPatients':
        return (
          <View style={styles.modalContent}>
  <Text style={styles.modalTitle}>All Patients</Text>

  {/* Search and Filter inside modal */}
  <View style={styles.searchContainer}>
    <TextInput
      style={styles.searchInput}
      placeholder="Search patients..."
      placeholderTextColor="#999"
      value={searchQuery}
      onChangeText={setSearchQuery}
    />
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Status:</Text>
      <View style={styles.filterPicker}>
        <Picker
          selectedValue={statusFilter}
          onValueChange={setStatusFilter}
          style={styles.filterPickerInput}
          dropdownIconColor="#666"
        >
          <Picker.Item label="All" value="All" />
          <Picker.Item label="Registered" value="Registered" />
          <Picker.Item label="Diagnosed" value="Diagnosed" />
          <Picker.Item label="Prescribed" value="Prescribed" />
          <Picker.Item label="Discharge" value="Discharge" />
          <Picker.Item label="Admit to Ward" value="Admit to Ward" />
          <Picker.Item label="Transfer to ICU" value="Transfer to ICU" />
          <Picker.Item label="Refer to Specialist" value="Refer to Specialist" />
        </Picker>
      </View>
    </View>
  </View>

  {/* Filtered list based on query/status */}
  <FlatList
    data={getFilteredPatients()}
    keyExtractor={item => item.id.toString()}
    renderItem={({ item }) => (
      <TouchableOpacity 
        style={[styles.patientItem, { borderLeftColor: getStatusColor(item.status) }]}
        onPress={() => {
          setSelectedPatient(item);
          setShowModal(false);
          setActiveScreen('patientDetails');
        }}
      >
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.patientIdText}>ID: {item.patientId}</Text>
        <Text style={[styles.patientStatus, { color: getStatusColor(item.status) }]}>
          Status: {item.status}
        </Text>
        {item.doctorName && (
  <Text style={styles.patientDoctor}>Doctor: {item.doctorName}</Text>  // ✅ Corrected
)}

      </TouchableOpacity>
    )}
    ListEmptyComponent={
      <Text style={styles.emptyListText}>No patients found</Text>
    }
  />
</View>

        );
      
      case 'notifications':
  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Notifications</Text>

      {/* TAB HEADERS */}
      <View style={{ flexDirection: 'row', marginBottom: 15 }}>
  <TouchableOpacity
    onPress={() => setNotificationTab('current')}
    style={{
      flex: 1,
      paddingVertical: 10,
      backgroundColor: notificationTab === 'current' ? '#1976d2' : '#e0e0e0',
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8
    }}
  >
    <Text style={{
      textAlign: 'center',
      color: notificationTab === 'current' ? 'white' : '#333',
      fontWeight: 'bold'
    }}>
      Current
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => {
      setNotificationTab('archived');
      fetchArchivedNotificationsFromBackend();  // 🔥 Fetch archived notifications here
    }}
    style={{
      flex: 1,
      paddingVertical: 10,
      backgroundColor: notificationTab === 'archived' ? '#1976d2' : '#e0e0e0',
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8
    }}
  >
    <Text style={{
      textAlign: 'center',
      color: notificationTab === 'archived' ? 'white' : '#333',
      fontWeight: 'bold'
    }}>
      Archived
    </Text>
  </TouchableOpacity>
</View>


      {/* TAB CONTENT */}
      <FlatList
  data={notificationTab === 'current' ? notifications : archivedNotifications}
  keyExtractor={item => item.id.toString()}
  renderItem={({ item }) => (
    <View style={styles.notificationItem}>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTime}>
        {new Date(item.timestamp).toLocaleDateString()} {' '}
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  )}
  ListEmptyComponent={
    <Text style={styles.emptyListText}>
      {notificationTab === 'current' ? 'No notifications' : 'No archived notifications'}
    </Text>
  }
/>


      {/* CLEAR BUTTON ONLY ON CURRENT TAB */}
      {notificationTab === 'current' && notifications.length > 0 && (
  <TouchableOpacity
    style={styles.clearNotificationsButton}
    onPress={archiveAllNotifications}
  >
    <Text style={styles.clearNotificationsText}>Clear All Notifications</Text>
  </TouchableOpacity>

      )}
    </View>
  );

        case 'archivedNotifications':
  return (
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Archived Notifications</Text>
      <FlatList
        data={archivedNotifications}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.notificationItem}>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationTime}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>No archived notifications</Text>
        }
      />
    </View>
  );

      default:
        return null;
    }
  };

  // Celebration animation
  const startBalloonAnimation = () => {
    Animated.timing(balloonAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true
    }).start();
  };

  const renderCelebration = () => {
    if (!showCelebration) return null;

    startBalloonAnimation();

    return (
      <View style={styles.celebrationContainer}>
        <LottieView
          source={require('./assets/confetti.json')}
          autoPlay
          loop={false}
          style={styles.confettiAnimation}
        />
        <Text style={styles.celebrationText}>PDF Generated Successfully!</Text>
      </View>
    );
  };

  const renderLoginCelebration = () => {
  if (!showCelebration || !celebrationMessage) return null;

  return (
    <View style={styles.fullscreenCelebration}>
      <LottieView
        source={require('./assets/Abhinek.json')}
        autoPlay
        loop={false}
        speed={1.2}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        onAnimationFinish={() => {
          setShowCelebration(false);
          setCelebrationMessage('');
        }}
      />
      <View style={styles.celebrationMessageContainer}>
        <Text style={styles.celebrationTitle}>🎉 Login Successful! 🎉</Text>
        <Text style={styles.celebrationSubtitle}>{celebrationMessage}</Text>
      </View>
    </View>
  );
};

{showLoginErrorAnim && (
  <View style={styles.fullscreenCelebration}>
    <LottieView
      source={require('./assets/login_error.json')}
      autoPlay
      loop={false}
      style={{ width: 200, height: 200 }}
    />
  </View>
)}


const renderHandwritingModal = () => (
  <Modal
    visible={showHandwritingModal}
    animationType="slide"
    transparent={false}
    onRequestClose={() => setShowHandwritingModal(false)}
  >
    <View style={{ flex: 1, padding: 20, backgroundColor: '#fefefe' }}>
      <Text style={{
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333'
      }}>
        {handwritingStep === 'name' ? '✍️ Write Patient Name' : '✍️ Write Patient Age'}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 }}>
        <MaterialIcons name="lightbulb-outline" size={24} color="#FFC107" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            color: '#444',
            lineHeight: 24
          }}>
            {handwritingStep === 'name'
              ? '• Use BLOCK LETTERS\n• Write slowly\n• Leave space between letters'
              : '• Write digits only like "25"\n• Avoid cursive or words'}
          </Text>
          {handwritingStep === 'name' && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: 'green', fontSize: 15, fontWeight: 'bold' }}>✅ GOOD: A L I C E</Text>
              <Text style={{ color: 'red', fontSize: 15, fontWeight: 'bold' }}>❌ BAD: Alice (cursive)</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flex: 1, marginVertical: 10 }}>
        <Signature
          ref={signatureRef}
          onOK={handleSignatureSubmit}
          onEmpty={() => {
            Alert.alert('Empty', 'Please write something before proceeding');
          }}
          descriptionText={`Write ${handwritingStep === 'name' ? 'Name' : 'Age'} below`}
          clearText="Clear"
          confirmText=""
          webStyle={`
            .m-signature-pad--footer { display: none; }
            .m-signature-pad--body {
              border: 2px dashed #bbb;
              background-color: #fafafa;
              border-radius: 12px;
              height: 300px; /* ⬆️ Larger canvas */
            }
            canvas {
              background-color: #fff;
            }
          `}
          penColor="black"
          backgroundColor="white"
          autoClear={true}
        />

        {/* ✅ Custom NEXT Button */}
        <TouchableOpacity
          style={{
            marginTop: 20,
            backgroundColor: '#4c669f',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
          }}
          onPress={() => {
            if (signatureRef.current) {
              signatureRef.current.readSignature();
            }
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
            Next
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Recognized Name */}
      {handwritingStep === 'name' && handwrittenName !== '' && (
        <View style={{
          alignItems: 'center',
          marginTop: 10,
          padding: 10,
          backgroundColor: '#e8f5e9',
          borderRadius: 10
        }}>
          <Text style={{
            fontWeight: 'bold',
            color: '#2e7d32',
            fontSize: 16
          }}>✅ Recognized Name:</Text>
          <Text style={{
            fontSize: 18,
            color: '#1b5e20',
            marginTop: 4
          }}>{handwrittenName}</Text>
        </View>
      )}

      {/* ✅ Recognized Age */}
      {handwritingStep === 'age' && handwrittenAge !== '' && (
        <View style={{
          alignItems: 'center',
          marginTop: 10,
          padding: 10,
          backgroundColor: '#e8f5e9',
          borderRadius: 10
        }}>
          <Text style={{
            fontWeight: 'bold',
            color: '#2e7d32',
            fontSize: 16
          }}>✅ Recognized Age:</Text>
          <Text style={{
            fontSize: 18,
            color: '#1b5e20',
            marginTop: 4
          }}>{handwrittenAge}</Text>
        </View>
      )}

      {/* ✅ Bottom Buttons */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            marginRight: 8,
            backgroundColor: '#e0e0e0',
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 14
          }}
          onPress={cancelHandwritingInput}
        >
          <Text style={{ color: '#444', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            marginLeft: 8,
            backgroundColor: '#3b5998',
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 14
          }}
          onPress={() => {
            setShowHandwritingModal(false);
            if (handwritingStep === 'name') {
              nameInputRef.current?.focus();
            } else {
              ageInputRef.current?.focus();
            }
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Type Instead</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);



const renderPreviewModal = () => (
  <Modal
    visible={showPreview}
    animationType="slide"
    transparent={false}
    onRequestClose={() => setShowPreview(false)}
  >
    <View style={{
      flex: 1,
      padding: 20,
      backgroundColor: '#ffffff',
      justifyContent: 'center',
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        color: '#333',
      }}>
        ✅ Verify Patient Details
      </Text>

      <View style={{
        alignItems: 'center',
        padding: 25,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        backgroundColor: '#f9f9f9',
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#444',
          marginBottom: 8,
        }}>👤 Patient Name</Text>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: '#1b5e20',
          marginBottom: 20,
        }}>{handwrittenName}</Text>

        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#444',
          marginBottom: 8,
        }}>🎂 Patient Age</Text>
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: '#1b5e20',
        }}>{handwrittenAge}</Text>
      </View>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 30,
      }}>
        {/* Edit Button */}
        <TouchableOpacity 
          style={{
            flex: 1,
            marginRight: 10,
            backgroundColor: '#e0e0e0',
            borderRadius: 10,
            alignItems: 'center',
            paddingVertical: 14,
          }}
          onPress={() => {
            setShowPreview(false);
            setHandwritingStep('name');
          }}
        >
          <Text style={{ color: '#444', fontWeight: '600', fontSize: 16 }}>
            ✏️ Edit
          </Text>
        </TouchableOpacity>

        {/* Confirm Button */}
        <TouchableOpacity 
          style={{
            flex: 1,
            marginLeft: 10,
            borderRadius: 10,
            overflow: 'hidden',
          }} 
          onPress={confirmHandwrittenDetails}
        >
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={{
              paddingVertical: 14,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
              ✅ Confirm
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

  // Main render function
return (
  <View style={styles.container}>
    {activeScreen === 'login' && renderLogin()}
    {activeScreen === 'erForm' && renderErForm()}
    {activeScreen === 'doctorDashboard' && renderDoctorDashboard()}
    {activeScreen === 'diagnosisForm' && renderDiagnosisForm()}
    {activeScreen === 'prescriptionForm' && renderPrescriptionForm()}
    {activeScreen === 'actionForm' && renderActionForm()}
    {activeScreen === 'patientDetails' && renderPatientDetails()}
    {activeScreen === 'profile' && renderProfilePage()}

    {/* ✍️ HANDWRITING MODALS */}
    {renderHandwritingModal()}
    {renderPreviewModal()}

    {/* 🩺 CONDITION PICKER MODAL */}
    <Modal
      transparent
      visible={showConditionPicker}
      animationType="fade"
      onRequestClose={() => setShowConditionPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowConditionPicker(false)}
      >
        <View style={styles.modalPicker}>
          {[
            {
              value: 'red',
              label: 'Red - Critical Emergency (Nurse → Doctor)',
              color: 'red',
            },
            {
              value: 'yellow',
              label: 'Yellow - Moderate Emergency (Self → Nurse/Doctor)',
              color: 'gold',
            },
            {
              value: 'blue',
              label: 'Blue - Non-Urgent (Can be used if required)',
              color: 'blue',
            },
          ].map((option, index, arr) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.modalOption,
                index === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                setErForm({ ...erForm, condition: option.value });
                setShowConditionPicker(false);
                setErFormErrors((prev) => ({
                  ...prev,
                  condition: undefined,
                }));
              }}
            >
              <View
                style={[styles.conditionDot, { backgroundColor: option.color }]}
              />
              <Text style={styles.conditionOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>

    {/* 📋 MAIN MODAL */}
    <Modal
      visible={showModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalContainer}>
        {renderModalContent()}
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={() => setShowModal(false)}
        >
          <Text style={styles.modalCloseButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>

    {/* 🎉 PDF Celebration */}
    {showPdfCelebration && (
      <View style={styles.celebrationContainer}>
        <LottieView
          source={require('./assets/confetti.json')}
          autoPlay
          loop={false}
          style={styles.confettiAnimation}
        />
        <Text style={styles.celebrationText}>PDF Generated Successfully!</Text>
      </View>
    )}

    {/* 🎉 Login Celebration */}
    {showLoginCelebration && (
      <View style={styles.fullscreenCelebration}>
        <LottieView
          source={require('./assets/Abhinek.json')}
          autoPlay
          loop={false}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
        />
        <LottieView
          source={require('./assets/confetti.json')}
          autoPlay
          loop={false}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            zIndex: 1,
          }}
          onAnimationFinish={() => {
            setShowLoginCelebration(false);
            setCelebrationMessage('');
          }}
        />
        <View
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            padding: 20,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            marginHorizontal: 20,
            zIndex: 999,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 22,
              fontWeight: 'bold',
              marginBottom: 8,
            }}
          >
            🎉 Login Successful! 🎉
          </Text>
          <Text
            style={{
              color: '#ddd',
              fontSize: 16,
              textAlign: 'center',
            }}
          >
            {celebrationMessage}
          </Text>
        </View>
      </View>
    )}

    {/* 🔔 TOASTS */}
    <Toast
      config={{
        custom_error: ({ text1, text2 }) => (
          <View
            style={{
              backgroundColor: '#D32F2F',
              padding: 20,
              borderRadius: 10,
              marginHorizontal: 20,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 6,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 20,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              {text1}
            </Text>
            {text2 && (
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  textAlign: 'center',
                  marginTop: 5,
                }}
              >
                {text2}
              </Text>
            )}
          </View>
        ),
      }}
    />
  </View>
);




};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loginBackground: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  loginBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileInfoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
  paddingVertical: 8,
  borderBottomColor: '#ddd',
  borderBottomWidth: 1,
  marginBottom: 10,
},

  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoIcon: {
    fontSize: 60,
  },
  inputContainer: {
    marginBottom: 15,
  },
  loginInput: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  rememberMeText: {
    fontSize: 16,
    color: '#333',
  },
  loginButton: {
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 15,
  },
  gradientButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dashboardBackground: {
    flex: 1,
    resizeMode: 'cover',
  },
  dashboardScrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  dashboardCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centeredProfileContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},

profileCard: {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: 15,
  padding: 25,
  width: '90%',
  maxWidth: 400,
  elevation: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3.84,
},

profileHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,
},

profileTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#333',
  marginLeft: 10,
},

avatarContainer: {
  alignItems: 'center',
  marginBottom: 30,
},


  dashboardTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 10,
  textAlign: 'center', // ✅ add this line
},

  welcomeText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginBottom: 20,
},

  statCard: {
  backgroundColor: '#f8f9fa',
  borderRadius: 8,
  padding: 15,
  alignItems: 'center',
  width: '48%', // Two in a row
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 1.41,
  elevation: 2,
},

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
dashboardButtonGroup: {
  marginBottom: 20,
  width: '100%',
  alignItems: 'center',
},



dashboardButton: {
  width: '100%',
  maxWidth: 300,
  alignSelf: 'center',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 12,
},

dashboardButtonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: 'bold',
  paddingVertical: 6,   // ✅ Reduce from 14 or 16 to 6
  textAlign: 'center',
},



  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  filterPicker: {
    flex: 1,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  filterPickerInput: {
    height: 50,
  },
  notificationButton: {
  width: '100%',
  maxWidth: 300,
  alignSelf: 'center',
  borderRadius: 10,
  paddingVertical: 12,
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f8f9fa',
  borderColor: '#ddd',
  borderWidth: 1,
  marginBottom: 12,
},
  notificationBadge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationButtonText: {
    fontSize: 16,
    color: '#333',
  },
  formContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  patientId: {
    fontSize: 16,
    color: '#1976d2',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  formInput: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  formPicker: {
    height: 50,
  },
  primaryButton: {
  width: '100%',
  maxWidth: 300,
  alignSelf: 'center',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 12,
},
  buttonText: {
  color: 'white',
  fontSize: 14,
  fontWeight: 'bold',
  paddingVertical: 6,   // ✅ Match it here too
  textAlign: 'center',
},

  secondaryButton: {
    borderColor: '#1976d2',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  secondaryButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
  width: '100%',
  maxWidth: 300,
  alignSelf: 'center',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 12,
},
  patientInfo: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  specialistContainer: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  specialistText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: 'bold',
  },
  patientDetailsRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    width: 120,
  },
  detailValue: {
    fontSize: 16,
    color: '#555',
    flex: 1,
  },
  timelineButton: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  timelineButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timelineContainer: {
    marginTop: 20,
    borderTopColor: '#ddd',
    borderTopWidth: 1,
    paddingTop: 15,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1976d2',
    marginRight: 10,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineAction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timelineBy: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  timelineNotes: {
    fontSize: 14,
    color: '#555',
    marginTop: 3,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  modalContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  patientItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#ddd',
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  patientIdText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  patientSymptoms: {
    fontSize: 14,
    color: '#666',
  },
  patientDiagnosis: {
    fontSize: 14,
    color: '#666',
  },
  patientPrescription: {
    fontSize: 14,
    color: '#666',
  },
  patientStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  patientDoctor: {
    fontSize: 14,
    color: '#666',
  },
  emptyListText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  modalCloseButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notificationItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  notificationMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  clearNotificationsButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  clearNotificationsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  confettiAnimation: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    position: 'absolute',
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  welcomeBanner: {
  backgroundColor: '#e3f2fd',
  borderRadius: 12,
  paddingVertical: 15,
  paddingHorizontal: 20,
  marginBottom: 20,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 3,
},

welcomeGreeting: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1976d2',
  marginBottom: 4,
},

welcomeName: {
  fontSize: 18,
  color: '#555',
},

fullscreenCelebration: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
},


celebrationMessageContainer: {
  position: 'absolute',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},

celebrationTitle: {
  fontSize: 28,
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: 10,
  textAlign: 'center',
},

celebrationSubtitle: {
  fontSize: 18,
  color: '#fff',
  textAlign: 'center',
},

errorText: {
  color: 'red',
  fontSize: 12,
  marginTop: 4,
},

conditionPickerButton: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 6,
  paddingVertical: 12,
  paddingHorizontal: 10,
  backgroundColor: '#fff',
  marginTop: 4,
},

conditionDisplay: {
  flexDirection: 'row',
  alignItems: 'center',
    paddingHorizontal: 12,

},

conditionDot: {
  width: 14,
  height: 14,
  borderRadius: 7,
  marginRight: 12,
},

conditionText: {
  flexShrink: 1,
  flexWrap: 'wrap',
  fontSize: 16,
  color: '#333',
}
,

modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.5)',
},

modalPicker: {
  backgroundColor: 'white',
  paddingVertical: 16,
  paddingHorizontal: 20,
  borderRadius: 12,
  width: '85%',
  alignSelf: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 6,
  elevation: 6,
  maxHeight: 300, // ✅ Responsive
},

modalOption: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 14,
  borderBottomColor: '#eee',
  borderBottomWidth: 1,
},


conditionOptionText: {
  fontSize: 16,
  color: '#333',
  flexShrink: 1,
},


handwritingContainer: {
  flex: 1,
  padding: 20,
  backgroundColor: '#fff',
},
handwritingTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 30,
  textAlign: 'center',
},
handwritingArea: {
  flex: 1,
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  marginBottom: 20,
  padding: 15,
},
handwritingInput: {
  flex: 1,
  fontSize: 18,
  textAlignVertical: 'top',
},
handwritingButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 20,
},
previewContainer: {
  flex: 1,
  padding: 20,
  backgroundColor: '#fff',
},
previewTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 30,
  textAlign: 'center',
},
previewDetails: {
  flex: 1,
  padding: 20,
},
previewLabel: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 5,
},
previewValue: {
  fontSize: 18,
  color: '#555',
  marginBottom: 20,
  paddingLeft: 10,
},
previewButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 20,
},
handwritingButton: {
  width: '100%',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 20,
},

loadingContainer: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(255,255,255,0.8)',
  zIndex: 10,
},
loadingText: {
  marginTop: 10,
  fontSize: 16,
  color: '#333',
},
recognizedText: {
  color: 'green',
  fontSize: 16,
  marginTop: 10,
  textAlign: 'center',
  fontWeight: 'bold',
},
handwritingGuidance: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFF9E1',
  padding: 10,
  borderRadius: 8,
  marginBottom: 15,
  borderLeftWidth: 4,
  borderLeftColor: '#FFC107',
},
handwritingHint: {
  fontSize: 14,
  color: '#795548',
  marginLeft: 8,
  flex: 1,
},
recognizedContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#E8F5E9',
  padding: 10,
  borderRadius: 8,
  marginTop: 10,
},
recognizedLabel: {
  fontSize: 14,
  color: '#2E7D32',
  fontWeight: 'bold',
  marginRight: 5,
},
recognizedText: {
  fontSize: 16,
  color: '#1B5E20',
  fontWeight: 'bold',
},
manualEntryButton: {
  backgroundColor: '#E3F2FD',
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 15,
  marginLeft: 10,
},
manualEntryButtonText: {
  color: '#1976D2',
  fontSize: 14,
  fontWeight: 'bold',
},
handwritingExample: {
  marginTop: 8,
},
exampleGood: {
  color: '#4CAF50',
  fontWeight: 'bold',
  fontSize: 12,
},
exampleBad: {
  color: '#F44336',
  fontSize: 12,
  fontStyle: 'italic',
},

});

export default App;