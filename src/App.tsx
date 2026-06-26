import React, { useState, useEffect } from "react";
import { initAuth, googleSignIn, googleSignOut } from "./firebase";
import { createApuCorpSpreadsheet, validateSpreadsheet, syncDatabaseToSpreadsheet } from "./sheetsService";
import { 
  Database, 
  User, 
  HelpCircle, 
  FileText, 
  ShieldCheck, 
  ChevronRight, 
  Info, 
  Layers, 
  MapPin, 
  CheckCircle, 
  AlertTriangle,
  Code,
  Check,
  Filter,
  RefreshCw,
  Users,
  BookOpen,
  TrendingUp,
  Video,
  Play,
  Lock,
  Plus,
  ArrowRight,
  Sparkles,
  Download,
  Send,
  Cpu,
  Loader2,
  FileDown,
  Sun,
  Moon,
  Smartphone,
  Laptop,
  LogIn,
  LogOut,
  Key,
  Upload,
  Link,
  FileVideo,
  Eye,
  EyeOff
} from "lucide-react";

interface Question {
  id: string;
  enunciado: string;
  opciones: string[];
  correcta: number;
}

interface Course {
  id: string;
  titulo: string;
  descripcion: string;
  videoUrl: string;
  preguntasGenerated: boolean;
  isDownloading: boolean;
  downloadPercent: number;
  downloaded: boolean;
  preguntas: Question[];
}

interface LoggedInUser {
  email: string;
  nombre: string;
  rol: "admin" | "agente";
  id?: string;
  dni?: string;
  celular?: string;
  sede?: string;
  puesto?: string;
  estado?: string;
  puntaje?: number;
  fecha?: string;
}

interface ApuCorpLogoProps {
  className?: string;
  showText?: boolean;
  textSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  iconSize?: string;
}

function ApuCorpLogo({ 
  className = "", 
  showText = false, 
  textSize = "lg", 
  iconSize = "h-10 w-10"
}: ApuCorpLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* SVG Icon matching exactly the corporate logo uploaded */}
      <svg 
        viewBox="0 0 100 100" 
        className={`${iconSize} shrink-0 drop-shadow-sm`} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Golden arrowhead pointing upward */}
        <path 
          d="M 50 10 L 78 43 L 64 43 L 50 29 L 36 43 L 22 43 Z" 
          fill="#F2BC3F" 
          stroke="#E0A72E"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Heavy protective arch / double chevron below (Adapts dynamically via text-currentColor) */}
        <path 
          d="M 10 74 L 10 65 L 36 48 L 64 48 L 90 65 L 90 74 L 75 74 L 58 59 L 42 59 L 25 74 Z" 
          fill="currentColor" 
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <div className="flex flex-col text-left leading-none">
          <span className={`font-black tracking-tight font-sans text-slate-900 dark:text-white uppercase ${
            textSize === "2xl" ? "text-xl md:text-2xl" :
            textSize === "xl" ? "text-lg md:text-xl" :
            textSize === "lg" ? "text-md md:text-lg" :
            textSize === "md" ? "text-sm md:text-md" :
            "text-xs"
          }`}>
            APUCORP
          </span>
          <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold tracking-widest uppercase mt-1">
            CAPACITACIÓN
          </span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Session / Authentication state
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  
  // Custom theme & device simulator state
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [deviceMode, setDeviceMode] = useState<"mobile" | "desktop">("mobile");

  // Login Form States
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  // New Course/Module states
  const [newCourseTitle, setNewCourseTitle] = useState<string>("");
  const [newCourseDesc, setNewCourseDesc] = useState<string>("");
  const [attachedVideoFile, setAttachedVideoFile] = useState<File | null>(null);
  const [attachedVideoName, setAttachedVideoName] = useState<string>("");
  const [videoAttachMethod, setVideoAttachMethod] = useState<"link" | "file">("link");
  const [youtubeUrl, setYoutubeUrl] = useState<string>("");
  const [isSimulatingLinkProcessing, setIsSimulatingLinkProcessing] = useState<boolean>(false);

  // Active step (3 = Agent Screen, 4 = Admin Panel)
  const [activeStep, setActiveStep] = useState<number>(3);
  
  const [adminFilterSede, setAdminFilterSede] = useState<string>("Todas");
  const [adminFilterEstado, setAdminFilterEstado] = useState<string>("Todos");
  const [simulationLog, setSimulationLog] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] 🚀 SISTEMA APUCORP INICIADO: Listo para recibir capacitaciones de agentes de seguridad.`
  ]);
  const [showAddAgentModal, setShowAddAgentModal] = useState<boolean>(false);
  
  // New Agent Form State
  const [newAgentName, setNewAgentName] = useState<string>("");
  const [newAgentEmail, setNewAgentEmail] = useState<string>("");
  const [newAgentDni, setNewAgentDni] = useState<string>("");
  const [newAgentCelular, setNewAgentCelular] = useState<string>("");
  const [newAgentSede, setNewAgentSede] = useState<string>("Sede Norte (Refinería)");
  const [newAgentPuesto, setNewAgentPuesto] = useState<string>("Vigilante de Acceso");

  // List of registered Agent Users for the Admin reports
  const [mockAgentes, setMockAgentes] = useState<{
    id: string;
    nombre: string;
    correo: string;
    dni: string;
    celular: string;
    sede: string;
    puesto: string;
    estado: "Aprobado" | "Pendiente";
    puntaje: number;
    fecha: string;
  }[]>([]);

  // Google Sheets state variables
  const [sheetsAccessToken, setSheetsAccessToken] = useState<string | null>(null);
  const [sheetsUser, setSheetsUser] = useState<any | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => localStorage.getItem("apucorp_sheet_id") || "");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => localStorage.getItem("apucorp_sheet_url") || "");
  const [isSheetsLoading, setIsSheetsLoading] = useState<boolean>(false);
  const [sheetsStatusMessage, setSheetsStatusMessage] = useState<string>("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => localStorage.getItem("apucorp_autosync") !== "false");

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setSheetsUser(user);
        setSheetsAccessToken(token);
        setSheetsStatusMessage("Conexión con Google Sheets activa.");
      },
      () => {
        setSheetsUser(null);
        setSheetsAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Video and test state for interactive agent simulation (Step 3)
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [isVideoFinished, setIsVideoFinished] = useState<boolean>(false);
  const [isTestStarted, setIsTestStarted] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<{ score: number; passed: boolean } | null>(null);

  // Video and Course Management states for Admin and Agent
  const [isGeneratingQuestionsId, setIsGeneratingQuestionsId] = useState<string | null>(null);
  const [showQuestionsCourseId, setShowQuestionsCourseId] = useState<string | null>(null);
  
  const [coursesList, setCoursesList] = useState<Course[]>([
    {
      id: "course_1",
      titulo: "Módulo 1: Protocolos de Intrusión y Control de Accesos",
      descripcion: "Procedimientos estándar de seguridad de APUCORP para garitas de control, inspección vehicular, patrullaje exterior y neutralización de intrusiones no autorizadas.",
      videoUrl: "https://example.com/videos/intrusion_apucorp.mp4",
      preguntasGenerated: false,
      isDownloading: false,
      downloadPercent: 0,
      downloaded: false,
      preguntas: [
        {
          id: "preg_001",
          enunciado: "¿Cuál es la primera acción del personal de seguridad ante una alerta de intrusión perimetral activa en la garita?",
          opciones: [
            "Ignorar la alerta y esperar a que termine el turno nocturno",
            "Dar aviso inmediato por radio al supervisor, verificar con cámaras de CCTV y aplicar protocolo de contención",
            "Abandonar el puesto de servicio e irse a casa por seguridad propia",
            "Publicar el incidente en redes sociales para alertar al público general"
          ],
          correcta: 1
        },
        {
          id: "preg_002",
          enunciado: "Si detecta a una persona sospechosa tomando fotografías de las cámaras de seguridad exteriores de APUCORP:",
          opciones: [
            "Ignorarla, ya que tomar fotos en la calle pública es 100% inofensivo",
            "Disparar una ronda de advertencia al aire de inmediato",
            "Reportar al centro de CCTV, indagar amablemente sobre su presencia y registrar detalles físicos del individuo",
            "Salir corriendo a agredirla verbalmente para ahuyentarla"
          ],
          correcta: 2
        },
        {
          id: "preg_003",
          enunciado: "En un control de acceso vehicular de APUCORP, el conductor se niega a abrir la maletera de un camión corporativo:",
          opciones: [
            "Dejarlo ingresar de todas formas por ser un empleado frecuente",
            "Insistir firmemente en el cumplimiento del protocolo, denegar temporalmente el acceso y dar parte al supervisor",
            "Proceder a forzar la maletera con un bastón metálico",
            "Gritarle al conductor e insultarlo hasta que ceda"
          ],
          correcta: 1
        }
      ]
    },
    {
      id: "course_2",
      titulo: "Módulo 2: Plan de Contingencia ante Incendios en Refinerías",
      descripcion: "Capacitación industrial avanzada de APUCORP para evacuar áreas de refinería, contención de fugas inflamables, uso de extintores específicos de CO2/PQS y enlace con brigadas.",
      videoUrl: "https://example.com/videos/incendios_refineria_apucorp.mp4",
      preguntasGenerated: false,
      isDownloading: false,
      downloadPercent: 0,
      downloaded: false,
      preguntas: [
        {
          id: "preg_004",
          enunciado: "Para fuegos tipo B que involucran hidrocarburos líquidos en la refinería, ¿cuál es el agente extintor contraindicado?",
          opciones: [
            "Chorro directo de agua (puede propagar la inflamación)",
            "Polvo Químico Seco (PQS)",
            "Dióxido de Carbono (CO2)",
            "Espuma química de alta densidad"
          ],
          correcta: 0
        },
        {
          id: "preg_005",
          enunciado: "Ante una fuga de gas licuado en planta, ¿en qué dirección debe realizarse la evacuación táctica?",
          opciones: [
            "A favor del viento para avanzar más rápido",
            "Perpendicular o en contra del viento, buscando zonas altas y despejadas",
            "Directamente hacia el punto de fuga para cerrarlo",
            "Buscar refugio en sótanos o fosas subterráneas"
          ],
          correcta: 1
        },
        {
          id: "preg_006",
          enunciado: "¿Quién está autorizado para dar la orden de reingreso a las instalaciones de APUCORP tras una emergencia?",
          opciones: [
            "El agente de seguridad más nuevo en la garita",
            "Solo el Jefe de Seguridad Industrial de APUCORP en coordinación con la brigada de emergencia",
            "Cualquier personal técnico de la refinería",
            "Los bomberos externos sin consulta interna"
          ],
          correcta: 1
        }
      ]
    },
    {
      id: "course_3",
      titulo: "Módulo 3: Seguridad Perimetral y Gestión de Crisis en Minería",
      descripcion: "Protocolos estratégicos de APUCORP para operaciones mineras en tajo abierto, prevención de intrusiones territoriales, control de cargamentos sospechosos y resguardo de maquinaria pesada.",
      videoUrl: "https://example.com/videos/mineria_crisis_apucorp.mp4",
      preguntasGenerated: false,
      isDownloading: false,
      downloadPercent: 0,
      downloaded: false,
      preguntas: [
        {
          id: "preg_007",
          enunciado: "¿Cuál es la frecuencia de radio designada para reportar una intrusión perimetral en la mina?",
          opciones: [
            "Frecuencia general de operaciones comerciales",
            "Canal 2 exclusivo de Emergencias y Seguridad Física de APUCORP",
            "Canal abierto de transportistas",
            "No se usa radio, se debe enviar mensaje de texto"
          ],
          correcta: 1
        },
        {
          id: "preg_008",
          enunciado: "Antes de ingresar al área operativa del tajo abierto, ¿cuál es el equipo de protección obligatorio (EPP)?",
          opciones: [
            "Ropa casual cómoda y zapatillas de lona",
            "Casco con barbiquejo, lentes con protección lateral, calzado de seguridad con punta de acero y chaleco reflectivo clase 3",
            "Únicamente credencial o pase magnético visible",
            "Lentes de sol y tapones auditivos simples"
          ],
          correcta: 1
        },
        {
          id: "preg_009",
          enunciado: "Si se detecta el ingreso no autorizado de un camión pesado a la zona de canteras, el agente debe:",
          opciones: [
            "Retener el vehículo en la zona de control perimetral, notificar de inmediato por Canal 2 y activar la barrera hidráulica",
            "Permitir el paso libre para no congestionar el tráfico",
            "Abandonar la caseta de vigilancia para perseguirlo corriendo",
            "Proceder a confiscar la carga sin reportar"
          ],
          correcta: 0
        }
      ]
    }
  ]);

  // Active training course currently dispatched to agents (by default, Module 1)
  const [activeCourse, setActiveCourse] = useState<Course>(coursesList[0]);

  // Form submission / validation for Custom Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail) {
      setLoginError("Por favor, ingrese su correo electrónico.");
      return;
    }

    const emailClean = loginEmail.trim().toLowerCase();

    // 1. Check if Admin
    if (emailClean === "gustavopveramendi@gmail.com") {
      setCurrentUser({
        email: "gustavopveramendi@gmail.com",
        nombre: "Gustavo Veramendi",
        rol: "admin"
      });
      setActiveStep(4); // Go to Admin Panel
      setDeviceMode("desktop"); // Default to PC view for Admin
      
      const timestamp = new Date().toLocaleTimeString();
      setSimulationLog(prev => [
        `[${timestamp}] 🔐 LOGIN ADMIN: Gustavo Veramendi ha iniciado sesión con perfil de Administrador de APUCORP.`,
        ...prev
      ]);
      return;
    }

    // 2. Check in registered Agents
    const foundAgent = mockAgentes.find(a => a.correo.toLowerCase() === emailClean);
    if (foundAgent) {
      setCurrentUser({
        email: foundAgent.correo,
        nombre: foundAgent.nombre,
        rol: "agente",
        id: foundAgent.id,
        dni: foundAgent.dni,
        celular: foundAgent.celular,
        sede: foundAgent.sede,
        puesto: foundAgent.puesto,
        estado: foundAgent.estado,
        puntaje: foundAgent.puntaje,
        fecha: foundAgent.fecha
      });
      setActiveStep(3); // Go to Agent Mobile UI
      setDeviceMode("mobile"); // Force simulation smartphone view for agent
      
      const timestamp = new Date().toLocaleTimeString();
      setSimulationLog(prev => [
        `[${timestamp}] 👮 LOGIN AGENTE: ${foundAgent.nombre} ha iniciado sesión. Unidad asignada: ${foundAgent.sede}.`,
        ...prev
      ]);
      return;
    }

    // 3. Email not registered
    setLoginError("Este correo no está registrado por el administrador. Inicie sesión como Administrador (gustavopveramendi@gmail.com) para darlo de alta, o use los botones de acceso rápido.");
  };

  // Logout handler
  const handleLogout = () => {
    const timestamp = new Date().toLocaleTimeString();
    setSimulationLog(prev => [
      `[${timestamp}] 🚪 SESIÓN CERRADA: El usuario ${currentUser?.nombre || ""} salió del sistema.`,
      ...prev
    ]);
    setCurrentUser(null);
    setLoginEmail("");
    setLoginError("");
    handleResetTest();
  };

  // Add new agent handler for Admin step (Step 4)
  const handleAddAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || !newAgentEmail || !newAgentDni) {
      alert("Por favor complete los campos obligatorios.");
      return;
    }

    const newAgent = {
      id: String(mockAgentes.length + 1),
      nombre: newAgentName,
      correo: newAgentEmail.trim(),
      dni: newAgentDni,
      celular: newAgentCelular || "999888777",
      sede: newAgentSede,
      puesto: newAgentPuesto,
      estado: "Pendiente" as const,
      puntaje: 0,
      fecha: "No registra intentos"
    };

    setMockAgentes([newAgent, ...mockAgentes]);
    setNewAgentName("");
    setNewAgentEmail("");
    setNewAgentDni("");
    setNewAgentCelular("");
    setShowAddAgentModal(false);
    
    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] 🆕 AGENTE REGISTRADO: Se ha dado de alta a '${newAgent.nombre}' con correo '${newAgent.correo}' en Firestore. Ahora este agente puede iniciar sesión con su correo.`;
    const updatedAgents = [newAgent, ...mockAgentes];
    const updatedLogs = [newLog, ...simulationLog];
    
    setMockAgentes(updatedAgents);
    setSimulationLog(updatedLogs);
    triggerAutoSync(coursesList, updatedAgents, updatedLogs);
  };

  // Submit handler for creating a new course/module with attached video
  const handleCreateCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle) {
      alert("Por favor, ingrese el título del módulo.");
      return;
    }

    let videoName = "";
    let logMessage = "";

    if (videoAttachMethod === "link") {
      if (!youtubeUrl) {
        alert("Por favor, ingrese el enlace de YouTube o cambie al método de subir archivo.");
        return;
      }
      // Simulate automatic video pre-fetching from YouTube URL
      setIsSimulatingLinkProcessing(true);
      
      const parsedId = youtubeUrl.includes("v=") 
        ? youtubeUrl.split("v=")[1]?.split("&")[0] 
        : youtubeUrl.split("/").pop();
      videoName = `YouTube_Video_${parsedId || "descargado"}.mp4`;
      
      const timestamp = new Date().toLocaleTimeString();
      setSimulationLog(prev => [
        `[${timestamp}] 📥 PROCESANDO ENLACE DE YOUTUBE: Descargando y convirtiendo "${youtubeUrl}" a formato MP4 comprimido en nuestro servidor APUCORP CDN para consumo offline...`,
        ...prev
      ]);

      setTimeout(() => {
        setIsSimulatingLinkProcessing(false);
        const finalNewCourse: Course = {
          id: "course_" + Date.now(),
          titulo: newCourseTitle,
          descripcion: newCourseDesc || "Módulo de capacitación táctica complementaria de APUCORP.",
          videoUrl: youtubeUrl.trim(),
          preguntasGenerated: false,
          isDownloading: false,
          downloadPercent: 0,
          downloaded: true, // Auto-downloaded and packed on backend!
          preguntas: getContingencyQuestions(newCourseTitle)
        };

        const updatedCourses = [...coursesList, finalNewCourse];
        setCoursesList(updatedCourses);
        setNewCourseTitle("");
        setNewCourseDesc("");
        setYoutubeUrl("");
        
        const doneTimestamp = new Date().toLocaleTimeString();
        const doneLog = `[${doneTimestamp}] ⚡ CONVERSIÓN YOUTUBE COMPLETADA: "${finalNewCourse.titulo}" listo para los agentes en campo. Se empaquetó offline con éxito.`;
        const updatedLogs = [doneLog, ...simulationLog];
        setSimulationLog(updatedLogs);
        
        triggerAutoSync(updatedCourses, mockAgentes, updatedLogs);
      }, 1200);

      return; // Handled asynchronously via timeout simulation
    } else {
      // File upload method
      videoName = attachedVideoName || "youtube_local_offline.mp4";
      const finalNewCourse: Course = {
        id: "course_" + Date.now(),
        titulo: newCourseTitle,
        descripcion: newCourseDesc || "Módulo de capacitación táctica complementaria de APUCORP.",
        videoUrl: videoName,
        preguntasGenerated: false,
        isDownloading: false,
        downloadPercent: 0,
        downloaded: true,
        preguntas: getContingencyQuestions(newCourseTitle)
      };

      const updatedCourses = [...coursesList, finalNewCourse];
      setCoursesList(updatedCourses);
      setNewCourseTitle("");
      setNewCourseDesc("");
      setAttachedVideoFile(null);
      setAttachedVideoName("");

      const timestamp = new Date().toLocaleTimeString();
      const newLog = `[${timestamp}] 🎬 NUEVO MÓDULO REGISTRADO (Carga local): Se creó "${finalNewCourse.titulo}" con archivo de video "${videoName}".`;
      const updatedLogs = [newLog, ...simulationLog];
      setSimulationLog(updatedLogs);
      
      triggerAutoSync(updatedCourses, mockAgentes, updatedLogs);
    }
  };

  // Helper helper to generate nice fallback questions
  const getContingencyQuestions = (title: string) => [
    {
      id: "preg_new_1_" + Date.now(),
      enunciado: `Con respecto al tema de "${title}", ¿cuál es la primera responsabilidad de un agente de seguridad?`,
      opciones: [
        "Actuar de manera autónoma sin reportar",
        "Seguir los protocolos establecidos por APUCORP y coordinar directamente con el Centro de Control",
        "Esperar a la finalización del turno nocturno para retirarse",
        "Informar únicamente si se registra un incidente de gravedad extrema"
      ],
      correcta: 1
    },
    {
      id: "preg_new_2_" + Date.now(),
      enunciado: `Ante un suceso imprevisto o intrusión relacionada con "${title}", ¿cuál es el canal de comunicación táctico prioritario?`,
      opciones: [
        "Frecuencia de radio de emergencias de APUCORP (Canal 2)",
        "Mensajería personal no cifrada",
        "Discusión informal en el cambio de guardia",
        "No reportar el suceso para evitar papeleo administrativo"
      ],
      correcta: 0
    },
    {
      id: "preg_new_3_" + Date.now(),
      enunciado: `¿Por qué es indispensable completar con éxito las evaluaciones periódicas de "${title}"?`,
      opciones: [
        "Para obtener permisos especiales de salida",
        "Por mero trámite burocrático de la oficina central",
        "Para asegurar que cada vigilante tiene la aptitud y conocimiento técnico para salvaguardar vidas y activos de la empresa",
        "No representa un requisito de valor real en las operaciones"
      ],
      correcta: 2
    }
  ];

  // Simulated video completion trigger
  const handleSimulateWatchVideo = () => {
    let current = 0;
    const interval = setInterval(() => {
      current += 10;
      setVideoProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setIsVideoFinished(true);
      }
    }, 250);
  };

  // Test answers selection
  const handleSelectAnswer = (qId: string, optIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [qId]: optIndex
    }));
  };

  // Submit test and calculate grades
  const handleSubmitTest = () => {
    let correctCount = 0;
    activeCourse.preguntas.forEach(q => {
      if (selectedAnswers[q.id] === q.correcta) {
        correctCount++;
      }
    });

    // 3 questions, scale score to 20
    let finalScore = 0;
    if (correctCount === 3) finalScore = 20;
    else if (correctCount === 2) finalScore = 14;
    else if (correctCount === 1) finalScore = 8;
    else finalScore = 0;

    const passed = finalScore > 10;
    setTestResult({
      score: finalScore,
      passed: passed
    });

    // Update in-memory user table for the currently logged-in agent
    const activeEmail = currentUser?.email || "";
    const updatedAgents = mockAgentes.map(agente => {
      if (agente.correo.toLowerCase() === activeEmail.toLowerCase()) {
        return {
          ...agente,
          puntaje: finalScore,
          estado: passed ? "Aprobado" as const : "Pendiente" as const,
          fecha: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      }
      return agente;
    });
    setMockAgentes(updatedAgents);

    // Sincronizar en currentUser si aplica
    if (currentUser && currentUser.rol === "agente") {
      setCurrentUser(prev => prev ? ({
        ...prev,
        puntaje: finalScore,
        estado: passed ? "Aprobado" : "Pendiente",
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16)
      }) : null);
    }

    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] 📝 EVALUACIÓN FINALIZADA: El agente '${currentUser?.nombre || "Demostración"}' obtuvo un puntaje de ${finalScore}/20 en el curso "${activeCourse.titulo}". Resultado: ${passed ? "APROBADO" : "REPROBADO (Debe repetir)"}.`;
    const updatedLogs = [newLog, ...simulationLog];
    setSimulationLog(updatedLogs);
    
    triggerAutoSync(coursesList, updatedAgents, updatedLogs);
  };

  // Reset evaluation simulation so agent can retake it (requires watching video again if failed)
  const handleResetTest = () => {
    setVideoProgress(0);
    setIsVideoFinished(false);
    setIsTestStarted(false);
    setSelectedAnswers({});
    setTestResult(null);
    setCurrentQuestionIndex(0);
  };

  // Generate questions using server-side Gemini API based on course topic
  const handleGenerateAiQuestions = async (courseId: string) => {
    const course = coursesList.find(c => c.id === courseId);
    if (!course) return;

    setIsGeneratingQuestionsId(courseId);
    const timestamp = new Date().toLocaleTimeString();
    
    setSimulationLog(prev => [
      `[${timestamp}] 🤖 IA GENERATION: Generando preguntas inteligentes con Gemini AI para el módulo: "${course.titulo}"...`,
      ...prev
    ]);

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoTitle: course.titulo,
          videoDescription: course.descripcion
        })
      });

      if (!response.ok) {
        throw new Error("La respuesta del servidor no fue exitosa (503/UNAVAILABLE u otra condición temporal).");
      }

      const data = await response.json();
      
      if (data.questions && Array.isArray(data.questions)) {
        const updatedCourses = coursesList.map(c => {
          if (c.id === courseId) {
            return {
              ...c,
              preguntas: data.questions,
              preguntasGenerated: true
            };
          }
          return c;
        });
        setCoursesList(updatedCourses);

        // If active, update
        if (activeCourse.id === courseId) {
          setActiveCourse(prev => ({
            ...prev,
            preguntas: data.questions,
            preguntasGenerated: true
          }));
        }

        const successTimestamp = new Date().toLocaleTimeString();
        const successLog = `[${successTimestamp}] ✅ IA GENERATION COMPLETADA: Se estructuraron 3 preguntas analíticas con Gemini AI con éxito.`;
        const updatedLogs = [successLog, ...simulationLog];
        setSimulationLog(updatedLogs);
        
        triggerAutoSync(updatedCourses, mockAgentes, updatedLogs);
      } else {
        throw new Error("Formato de preguntas inválido.");
      }

    } catch (err: any) {
      console.error("Error generating AI questions:", err);
      const failTimestamp = new Date().toLocaleTimeString();
      setSimulationLog(prev => [
        `[${failTimestamp}] ⚠️ ERROR EN GENERACIÓN DE IA: ${err.message}. El sistema de APUCORP activó automáticamente las preguntas de contingencia precargadas en memoria.`,
        ...prev
      ]);
    } finally {
      setIsGeneratingQuestionsId(null);
    }
  };

  // Simulate video download for the administrator
  const handleDownloadVideo = (courseId: string) => {
    setCoursesList(prev => prev.map(c => {
      if (c.id === courseId) {
        return { ...c, isDownloading: true, downloadPercent: 0 };
      }
      return c;
    }));

    const interval = setInterval(() => {
      setCoursesList(prev => prev.map(c => {
        if (c.id === courseId) {
          const nextPercent = c.downloadPercent + 25;
          if (nextPercent >= 100) {
            clearInterval(interval);
            
            const timestamp = new Date().toLocaleTimeString();
            setSimulationLog(logs => [
              `[${timestamp}] 💾 VIDEO DESCARGADO: Módulo de video "${c.titulo}" descargado exitosamente en almacenamiento local. Listo para compartir de manera offline.`,
              ...logs
            ]);

            return { ...c, isDownloading: false, downloadPercent: 100, downloaded: true };
          }
          return { ...c, downloadPercent: nextPercent };
        }
        return c;
      }));
    }, 250);
  };

  // --- GOOGLE SHEETS INTEGRATION LOGIC ---

  // Manual or automatic synchronization to Sheets
  const performSyncToSheets = async (
    token: string, 
    sheetId: string, 
    customCourses = coursesList, 
    customAgents = mockAgentes, 
    customLogs = simulationLog
  ) => {
    if (!token || !sheetId) return;
    setIsSheetsLoading(true);
    setSheetsStatusMessage("Sincronizando base de datos...");
    try {
      await syncDatabaseToSpreadsheet(token, sheetId, customCourses, customAgents, customLogs);
      setSheetsStatusMessage("Base de datos sincronizada con Google Sheets!");
      const timestamp = new Date().toLocaleTimeString();
      setSimulationLog(prev => [
        `[${timestamp}] 📊 GOOGLE SHEETS SYNC: Base de datos exportada exitosamente a Google Sheets (Hoja ID: ${sheetId.substring(0, 8)}...).`,
        ...prev
      ]);
    } catch (error: any) {
      console.error("Error al sincronizar Sheets:", error);
      setSheetsStatusMessage(`Error de Sincronización: ${error.message || error}`);
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleSheetsConnect = async () => {
    setIsSheetsLoading(true);
    setSheetsStatusMessage("Abriendo popup de autenticación...");
    try {
      const result = await googleSignIn();
      if (result) {
        setSheetsUser(result.user);
        setSheetsAccessToken(result.accessToken);
        setSheetsStatusMessage("Conectado a Google Workspace con éxito!");
        const timestamp = new Date().toLocaleTimeString();
        setSimulationLog(prev => [
          `[${timestamp}] 🔐 GOOGLE SIGN-IN: Administrador inició sesión en Google Workspace (Correo: ${result.user.email}).`,
          ...prev
        ]);
        
        // If a sheet ID already exists, auto-sync
        if (spreadsheetId) {
          await performSyncToSheets(result.accessToken, spreadsheetId, coursesList, mockAgentes, simulationLog);
        }
      }
    } catch (error: any) {
      setSheetsStatusMessage(`Error de inicio de sesión: ${error.message || error}`);
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleSheetsDisconnect = async () => {
    setIsSheetsLoading(true);
    try {
      await googleSignOut();
      setSheetsUser(null);
      setSheetsAccessToken(null);
      setSheetsStatusMessage("Sesión de Google Sheets cerrada.");
      const timestamp = new Date().toLocaleTimeString();
      setSimulationLog(prev => [
        `[${timestamp}] 🔓 GOOGLE LOGOUT: Se cerró la sesión de Google Workspace.`,
        ...prev
      ]);
    } catch (error: any) {
      setSheetsStatusMessage(`Error al cerrar sesión: ${error.message || error}`);
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!sheetsAccessToken) {
      setSheetsStatusMessage("Debe iniciar sesión primero.");
      return;
    }
    setIsSheetsLoading(true);
    setSheetsStatusMessage("Creando nueva hoja de cálculo...");
    try {
      const res = await createApuCorpSpreadsheet(
        sheetsAccessToken,
        `Base de Datos APUCORP CAPACITA - ${new Date().toLocaleDateString()}`
      );
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetUrl(res.spreadsheetUrl);
      localStorage.setItem("apucorp_sheet_id", res.spreadsheetId);
      localStorage.setItem("apucorp_sheet_url", res.spreadsheetUrl);
      
      setSheetsStatusMessage("Hoja de cálculo creada exitosamente. Sincronizando datos...");
      
      // Perform initial sync
      await performSyncToSheets(sheetsAccessToken, res.spreadsheetId, coursesList, mockAgentes, simulationLog);
    } catch (error: any) {
      setSheetsStatusMessage(`Error al crear hoja: ${error.message || error}`);
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleConnectExistingSheet = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return;
    if (!sheetsAccessToken) {
      setSheetsStatusMessage("Debe iniciar sesión primero.");
      return;
    }
    setIsSheetsLoading(true);
    setSheetsStatusMessage("Validando hoja de cálculo...");
    try {
      const isValid = await validateSpreadsheet(sheetsAccessToken, cleanId);
      if (isValid) {
        setSpreadsheetId(cleanId);
        const url = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
        setSpreadsheetUrl(url);
        localStorage.setItem("apucorp_sheet_id", cleanId);
        localStorage.setItem("apucorp_sheet_url", url);
        setSheetsStatusMessage("Conectado con éxito a la hoja existente. Sincronizando...");
        await performSyncToSheets(sheetsAccessToken, cleanId, coursesList, mockAgentes, simulationLog);
      } else {
        setSheetsStatusMessage("No se pudo acceder a la hoja de cálculo. Verifique el ID e inténtelo de nuevo.");
      }
    } catch (error: any) {
      setSheetsStatusMessage(`Error al conectar: ${error.message || error}`);
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!sheetsAccessToken || !spreadsheetId) return;
    await performSyncToSheets(sheetsAccessToken, spreadsheetId, coursesList, mockAgentes, simulationLog);
  };

  // Background auto-sync trigger helper
  const triggerAutoSync = (
    updatedCourses = coursesList, 
    updatedAgents = mockAgentes, 
    updatedLogs = simulationLog
  ) => {
    if (autoSyncEnabled && sheetsAccessToken && spreadsheetId) {
      performSyncToSheets(sheetsAccessToken, spreadsheetId, updatedCourses, updatedAgents, updatedLogs);
    }
  };

  // Dispatch active course and its questions to the Agent app simulation (Step 3)
  const handleDispatchCourse = (courseId: string) => {
    const course = coursesList.find(c => c.id === courseId);
    if (!course) return;

    setActiveCourse(course);
    
    // Reset agent view simulation state for a clean experience
    setVideoProgress(0);
    setIsVideoFinished(false);
    setIsTestStarted(false);
    setSelectedAnswers({});
    setTestResult(null);
    setCurrentQuestionIndex(0);

    const timestamp = new Date().toLocaleTimeString();
    setSimulationLog(prev => [
      `[${timestamp}] 🚀 CURSO DISTRIBUIDO: Se activó y distribuyó "${course.titulo}" a la App de Capacitación del Agente. El examen obligatorio ha sido configurado con éxito.`,
      ...prev
    ]);
  };

  // Calculate stats for overview cards
  const totalAgents = mockAgentes.length;
  const approvedAgents = mockAgentes.filter(a => a.estado === "Aprobado").length;
  const pendingAgents = mockAgentes.filter(a => a.estado === "Pendiente").length;
  const approvalRate = totalAgents > 0 ? Math.round((approvedAgents / totalAgents) * 100) : 0;

  // Filtered Agentes list
  const filteredAgentes = mockAgentes.filter(agente => {
    const matchSede = adminFilterSede === "Todas" || agente.sede.includes(adminFilterSede);
    const matchEstado = adminFilterEstado === "Todos" || agente.estado === adminFilterEstado;
    return matchSede && matchEstado;
  });

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 ${
      darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"
    }`} style={{ colorScheme: darkMode ? "dark" : "light" }}>
      
      {/* 1. LOGIN SCREEN WHEN NOT AUTHENTICATED */}
      {currentUser === null ? (
        <div className="flex-1 flex flex-col justify-center items-center p-4 relative overflow-hidden">
          {/* Theme switcher on Login Page */}
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition-all ${
                darkMode 
                  ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-amber-400" 
                  : "bg-white border-slate-200 hover:bg-slate-100 text-slate-600"
              }`}
              title="Alternar Tema"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          <div className="w-full max-w-md">
            {/* Header / Logo */}
            <div className="flex flex-col items-center text-center mb-8">
              <ApuCorpLogo 
                className="text-slate-800 dark:text-slate-200 mb-2" 
                iconSize="h-20 w-20" 
                showText={false}
              />
              <h1 className="text-2xl font-black tracking-tight font-sans uppercase">
                APUCORP <span className="text-indigo-600 dark:text-indigo-400">Capacita</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto">
                Plataforma de capacitación táctica, distribución de video offline y evaluación para agentes de seguridad
              </p>
            </div>

            {/* Login Card */}
            <div className={`p-8 border rounded-2xl shadow-xl transition-colors duration-300 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="flex items-center gap-2 mb-6 border-b pb-3 border-slate-100 dark:border-slate-800">
                <LogIn className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Ingreso al Sistema</h2>
              </div>

              {loginError && (
                <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex gap-2 items-start leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@seguro.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className={`w-full p-2.5 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                      darkMode 
                        ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" 
                        : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" /> Ingresar a Capacitación
                </button>
              </form>

              {/* Quick access logins */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
                  Accesos Rápidos {mockAgentes.length > 0 ? "Disponibles" : "de Administración"}
                </span>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setLoginEmail("gustavopveramendi@gmail.com");
                      setLoginError("");
                    }}
                    className={`w-full py-2 px-3 border rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between ${
                      darkMode 
                        ? "border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-indigo-300" 
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-indigo-700"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 shrink-0" />
                      <strong>Administrador:</strong> gustavopveramendi@gmail.com
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  {mockAgentes.slice(0, 3).map((agente, index) => (
                    <button
                      key={agente.id}
                      onClick={() => {
                        setLoginEmail(agente.correo);
                        setLoginError("");
                      }}
                      className={`w-full py-2 px-3 border rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between ${
                        darkMode 
                          ? "border-slate-800 bg-slate-950/60 hover:bg-slate-950 text-emerald-300" 
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-emerald-800"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <strong>Agente {index + 1}:</strong> <span className="truncate">{agente.correo}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  ))}

                  {mockAgentes.length === 0 && (
                    <p className="text-[10px] text-center text-slate-400 italic mt-2">
                      No hay agentes registrados aún. Inicie sesión como Administrador para registrarlos.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* 2. MAIN APPLICATION CONTENT WHEN LOGGED IN */
        <div className="h-screen w-full flex overflow-hidden">
          
          {/* SIDEBAR FOR ADMINISTRATOR ONLY */}
          {currentUser.rol === "admin" && (
            <aside className={`w-68 border-r transition-all duration-300 shrink-0 flex flex-col ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="p-6">
                <ApuCorpLogo 
                  className="mb-8 text-slate-850 dark:text-slate-200" 
                  showText={true} 
                  textSize="md" 
                  iconSize="h-10 w-10"
                />
                
                <nav className="space-y-1">
                  <button 
                    onClick={() => setActiveStep(3)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg font-medium text-xs transition-all text-left ${
                      activeStep === 3 
                        ? "bg-indigo-600 text-white font-semibold shadow-xs" 
                        : (darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100")
                    }`}
                  >
                    <Video className="w-4 h-4 shrink-0" />
                    <span>Vista del Agente (Móvil)</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveStep(4)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg font-medium text-xs transition-all text-left ${
                      activeStep === 4 
                        ? "bg-indigo-600 text-white font-semibold shadow-xs" 
                        : (darkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100")
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Panel de Administrador</span>
                  </button>
                </nav>
              </div>

              {/* Administrator info widget with Logout */}
              <div className={`mt-auto p-5 border-t flex flex-col gap-3 ${
                darkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-150 bg-slate-50/80"
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                    GV
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-xs font-bold truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{currentUser.nombre}</p>
                    <p className="text-[9px] text-indigo-500 font-mono truncate">{currentUser.email}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full py-1.5 border border-red-500/30 hover:bg-red-500/10 text-red-500 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión (Admin)
                </button>
              </div>
            </aside>
          )}

          {/* MAIN CONTAINER AND CONTENT */}
          <main className="flex-1 flex flex-col overflow-hidden">
            
            {/* GLOBAL HEADER */}
            <header className={`h-16 border-b px-8 flex items-center justify-between shrink-0 transition-colors duration-300 ${
              darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center space-x-3">
                <ApuCorpLogo 
                  className="text-slate-800 dark:text-slate-200" 
                  showText={true} 
                  textSize="sm" 
                  iconSize="h-7 w-7"
                />
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-medium">
                  {currentUser.rol === "admin" 
                    ? `Vista: ${activeStep === 3 ? "Simulación de Agente" : "Panel de Reportes e IA"}`
                    : `Área de Capacitación del Agente`}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                {/* Theme toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-lg border transition-all ${
                    darkMode 
                      ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-amber-400" 
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                  title="Alternar Tema"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Register Agent quick action (Admin only in Panel) */}
                {currentUser.rol === "admin" && activeStep === 4 && (
                  <button 
                    onClick={() => setShowAddAgentModal(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Registrar Agente
                  </button>
                )}

                {/* Logout Button for Agents (Who do not have sidebar) */}
                {currentUser.rol === "agente" && (
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 border border-red-500/20 hover:bg-red-500/10 text-red-500 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Salir
                  </button>
                )}

                <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md uppercase font-mono tracking-wider">
                  {currentUser.rol.toUpperCase()}
                </span>
              </div>
            </header>

            {/* PAGE VIEWPORT */}
            <div className={`p-6 space-y-6 flex-1 overflow-y-auto ${darkMode ? "bg-slate-950" : "bg-[#F9FAFB]"}`}>
              
              {/* STATS TILES FOR ADMIN - SHOWN ONLY ON ADMIN LEVEL */}
              {currentUser.rol === "admin" && activeStep === 4 && (
                <section className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0 animate-fade-in">
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Agentes Registrados</p>
                      <p className="text-xl font-black">{totalAgents}</p>
                    </div>
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Capacitados / Aprobados</p>
                      <p className="text-xl font-black text-emerald-600">
                        {approvedAgents} <span className="text-xs font-normal text-slate-400">({approvalRate}%)</span>
                      </p>
                    </div>
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Falta Evaluación</p>
                      <p className="text-xl font-black text-amber-500">{pendingAgents}</p>
                    </div>
                    <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                </section>
              )}

              {/* MAIN BODY SWITCH */}
              <div className="space-y-6">
                
                {/* ACTIVE VIEW 3: AGENT INTERACTIVE TRAINING APP WITH CELULAR / DESKTOP OPTION */}
                {activeStep === 3 && (
                  <div className="space-y-5">
                    
                    {/* Device selector toggles */}
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-900 p-2 rounded-xl max-w-sm mx-auto">
                      <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2">
                        Simulador:
                      </span>
                      <div className="flex space-x-1">
                        <button 
                          onClick={() => setDeviceMode("mobile")}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            deviceMode === "mobile" 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : (darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" /> Celular
                        </button>
                        <button 
                          onClick={() => setDeviceMode("desktop")}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                            deviceMode === "desktop" 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : (darkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")
                          }`}
                        >
                          <Laptop className="w-3.5 h-3.5" /> PC
                        </button>
                      </div>
                    </div>

                    {/* RENDERING SMARTPHONE CONTAINER SCHEME */}
                    {deviceMode === "mobile" ? (
                      <div className="flex justify-center py-2 animate-fade-in">
                        {/* Smartphone body frame */}
                        <div className="relative border-[11px] rounded-[48px] shadow-2xl w-[370px] h-[750px] flex flex-col overflow-hidden border-slate-950 dark:border-slate-800 bg-slate-950">
                          
                          {/* Top Speaker / Island notch */}
                          <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 w-28 h-5.5 bg-slate-950 rounded-full z-40 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-slate-900 mr-2 border border-slate-800"></div>
                            <div className="w-10 h-1 bg-slate-900 rounded-full"></div>
                          </div>
                          
                          {/* Status bar */}
                          <div className={`h-10 px-6 pt-3 flex items-center justify-between text-[10px] font-bold z-30 select-none shrink-0 ${
                            darkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
                          }`}>
                            <span>09:41</span>
                            <div className="flex items-center space-x-1.5">
                              <span>📶</span>
                              <span>🔋</span>
                            </div>
                          </div>

                          {/* Smartphone main scrollable content area */}
                          <div className={`flex-1 overflow-y-auto px-4 py-3 pb-8 ${
                            darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-800"
                          }`}>
                            <AgentContent 
                              currentUser={currentUser}
                              activeCourse={activeCourse}
                              coursesList={coursesList}
                              videoProgress={videoProgress}
                              isVideoFinished={isVideoFinished}
                              isTestStarted={isTestStarted}
                              currentQuestionIndex={currentQuestionIndex}
                              selectedAnswers={selectedAnswers}
                              testResult={testResult}
                              setIsTestStarted={setIsTestStarted}
                              setCurrentQuestionIndex={setCurrentQuestionIndex}
                              handleSimulateWatchVideo={handleSimulateWatchVideo}
                              handleSelectAnswer={handleSelectAnswer}
                              handleSubmitTest={handleSubmitTest}
                              handleResetTest={handleResetTest}
                              darkMode={darkMode}
                            />
                          </div>

                          {/* Smartphone home bar */}
                          <div className={`h-4 flex items-center justify-center pb-1 shrink-0 ${
                            darkMode ? "bg-slate-900" : "bg-white"
                          }`}>
                            <div className="w-28 h-1 bg-slate-400 rounded-full"></div>
                          </div>

                        </div>
                      </div>
                    ) : (
                      /* RENDERING EXPANDED DESKTOP SCREEN */
                      <div className={`p-6 rounded-2xl border transition-colors duration-300 max-w-5xl mx-auto animate-fade-in ${
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-md"
                      }`}>
                        <div className="border-b pb-3 mb-5 border-slate-100 dark:border-slate-850 flex justify-between items-center">
                          <div>
                            <h2 className="text-md font-bold flex items-center gap-2">
                              <Video className="text-indigo-600 dark:text-indigo-400 w-4 h-4" />
                              Módulo de Capacitación del Agente de Seguridad (Escritorio completo)
                            </h2>
                            <p className="text-[11px] text-slate-400">
                              Simulación interactiva de reproducción de video obligatorio y evaluación reglamentaria
                            </p>
                          </div>
                        </div>

                        <AgentContent 
                          currentUser={currentUser}
                          activeCourse={activeCourse}
                          coursesList={coursesList}
                          videoProgress={videoProgress}
                          isVideoFinished={isVideoFinished}
                          isTestStarted={isTestStarted}
                          currentQuestionIndex={currentQuestionIndex}
                          selectedAnswers={selectedAnswers}
                          testResult={testResult}
                          setIsTestStarted={setIsTestStarted}
                          setCurrentQuestionIndex={setCurrentQuestionIndex}
                          handleSimulateWatchVideo={handleSimulateWatchVideo}
                          handleSelectAnswer={handleSelectAnswer}
                          handleSubmitTest={handleSubmitTest}
                          handleResetTest={handleResetTest}
                          darkMode={darkMode}
                        />
                      </div>
                    )}

                  </div>
                )}

                {/* ACTIVE VIEW 4: ADMIN PANEL - COURSE, AI QUESTIONS & AGENTS REPORT */}
                {activeStep === 4 && currentUser.rol === "admin" && (
                  <div className="space-y-6 animate-fade-in">
                    
                    {/* Tarjeta de Base de Datos en Google Sheets (Integración Oficial) */}
                    <div className={`p-6 rounded-2xl border transition-all ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                    }`}>
                      <div className="border-b border-slate-150 dark:border-slate-800 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            <Database className="w-4 h-4" />
                            Base de Datos en Google Sheets™
                          </h2>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Gestione el almacenamiento centralizado en la nube para agentes, cursos y bitácoras usando Google Workspace.
                          </p>
                        </div>

                        {/* Status badge */}
                        <div className="flex items-center">
                          {sheetsUser ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              En la Nube (Sincronizado)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Local (Sin Nube)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Connection States */}
                      {!sheetsUser ? (
                        <div className="space-y-4 py-2">
                          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                            darkMode ? "bg-slate-950/50 border-slate-850 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}>
                            <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">💡 Ventajas de conectar Google Sheets:</p>
                            <ul className="list-disc list-inside space-y-1 text-[11px]">
                              <li>Persistencia indestructible independiente del caché o cierres de sesión.</li>
                              <li>Mapeo automático de agentes, notas aprobadas y bitácoras operativas en tiempo real.</li>
                              <li>Acceso directo desde cualquier dispositivo a la hoja de cálculo de Google Drive.</li>
                            </ul>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <button
                              type="button"
                              onClick={handleSheetsConnect}
                              disabled={isSheetsLoading}
                              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                            >
                              {isSheetsLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <LogIn className="w-4 h-4" />
                              )}
                              Vincular Cuenta de Google Workspace
                            </button>
                            
                            {sheetsStatusMessage && (
                              <p className="text-[10px] font-mono text-slate-400 text-center sm:text-right">
                                {sheetsStatusMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Logged in header details */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850">
                            <div className="flex items-center gap-3">
                              {sheetsUser.photoURL ? (
                                <img 
                                  src={sheetsUser.photoURL} 
                                  alt="Google avatar" 
                                  className="w-9 h-9 rounded-full border border-emerald-500/30"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                  {sheetsUser.displayName?.charAt(0) || "G"}
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-slate-850 dark:text-slate-250">
                                  {sheetsUser.displayName || "Administrador Google"}
                                </p>
                                <p className="text-[10px] font-mono text-slate-400">
                                  {sheetsUser.email}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleSheetsDisconnect}
                              disabled={isSheetsLoading}
                              className="px-3 py-1.5 border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Desconectar Cuenta
                            </button>
                          </div>

                          {/* Spreadsheet state configuration */}
                          {!spreadsheetId ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                              {/* Create new */}
                              <div className="space-y-3 flex flex-col justify-between">
                                <div>
                                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Opción A: Crear una nueva base de datos</h3>
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    Crea automáticamente un libro con pestañas formateadas para Módulos, Agentes registrados y Bitácoras.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleCreateNewSheet}
                                  disabled={isSheetsLoading}
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 mt-2"
                                >
                                  {isSheetsLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                  Generar Libro en Google Sheets™
                                </button>
                              </div>

                              {/* Connect existing */}
                              <div className="space-y-3 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-150 dark:border-slate-800 pt-4 md:pt-0 md:pl-5">
                                <div>
                                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Opción B: Conectar libro existente</h3>
                                  <p className="text-[10px] text-slate-500 mt-1">
                                    Ingrese el ID único de una hoja de cálculo ya creada para vincularla.
                                  </p>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <input
                                    type="text"
                                    id="existing-sheet-id"
                                    placeholder="ID de la hoja de cálculo..."
                                    className={`flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 ${
                                      darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-800"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById("existing-sheet-id") as HTMLInputElement;
                                      if (el?.value) {
                                        handleConnectExistingSheet(el.value);
                                      } else {
                                        alert("Por favor, ingrese un ID válido.");
                                      }
                                    }}
                                    disabled={isSheetsLoading}
                                    className="px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                                  >
                                    Vincular
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Spreadsheet connected display */}
                              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      Libro APUCORP Activo
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[8px] font-black rounded uppercase font-mono">
                                      Conectado
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-400 select-all truncate max-w-xs md:max-w-md">
                                    ID: {spreadsheetId}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  {spreadsheetUrl && (
                                    <a
                                      href={spreadsheetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3.5 py-2 border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                      Abrir Libro
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSpreadsheetId("");
                                      setSpreadsheetUrl("");
                                      localStorage.removeItem("apucorp_sheet_id");
                                      localStorage.removeItem("apucorp_sheet_url");
                                      setSheetsStatusMessage("Hoja de cálculo desvinculada localmente.");
                                    }}
                                    className="px-3.5 py-2 border border-rose-500/30 hover:bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold transition-all"
                                    title="Desvincular esta hoja"
                                  >
                                    Desvincular
                                  </button>
                                </div>
                              </div>

                              {/* Sync Actions & Settings */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                                <div className="flex items-center gap-5">
                                  {/* AutoSync Switch */}
                                  <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={autoSyncEnabled}
                                      onChange={(e) => {
                                        setAutoSyncEnabled(e.target.checked);
                                        localStorage.setItem("apucorp_autosync", String(e.target.checked));
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                    <span className="ml-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                      Sincronización Automática en la Nube
                                    </span>
                                  </label>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleManualSync}
                                  disabled={isSheetsLoading}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                                >
                                  {isSheetsLoading ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  )}
                                  Exportar Datos Manualmente
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Console style message bar */}
                          {sheetsStatusMessage && (
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-mono text-emerald-500">
                                  {sheetsStatusMessage}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 uppercase select-none">
                                API SHEETS V4
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Formulario de Creación de Módulos (Adjuntar Video de YouTube) */}
                    <div className={`p-6 rounded-2xl border ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                        <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                          <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Crear Nuevo Módulo de Capacitación
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Registre un nuevo módulo de video táctico descargado de YouTube y asócielo al plan de estudios oficial de APUCORP.
                        </p>
                      </div>

                      <form onSubmit={handleCreateCourseSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Título del Módulo:</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Módulo 4: Prevención de Sabotaje Industrial"
                              value={newCourseTitle}
                              onChange={(e) => setNewCourseTitle(e.target.value)}
                              className={`w-full p-2.5 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                                darkMode 
                                  ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" 
                                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Descripción del Contenido:</label>
                            <input
                              type="text"
                              placeholder="Ej: Instrucciones tácticas de APUCORP para salvaguardar subestaciones..."
                              value={newCourseDesc}
                              onChange={(e) => setNewCourseDesc(e.target.value)}
                              className={`w-full p-2.5 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                                darkMode 
                                  ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" 
                                  : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Selector de Método: Copiar Enlace vs Cargar Archivo */}
                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-slate-500">¿Cómo prefiere adjuntar el video del módulo?</label>
                          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setVideoAttachMethod("link")}
                              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                videoAttachMethod === "link"
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              }`}
                            >
                              <Link className="w-3.5 h-3.5" />
                              Copiar Enlace (Recomendado)
                            </button>
                            <button
                              type="button"
                              onClick={() => setVideoAttachMethod("file")}
                              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                videoAttachMethod === "file"
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              }`}
                            >
                              <FileVideo className="w-3.5 h-3.5" />
                              Subir Archivo (.mp4 / .mkv)
                            </button>
                          </div>
                        </div>

                        {/* Caja Comparativa de Métodos (Explicación de Cuál es Mejor) */}
                        <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                          darkMode ? "bg-slate-950/60 border-slate-800 text-slate-400" : "bg-indigo-50/40 border-indigo-100 text-slate-600"
                        }`}>
                          <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400">
                            <HelpCircle className="w-4 h-4 shrink-0" />
                            <span>Análisis Táctico: ¿Qué método es mejor?</span>
                          </div>
                          <p>
                            <strong>Copiar Enlace (Mejor):</strong> Es altamente recomendable porque <strong>no consume su ancho de banda de subida</strong>. Simplemente ingresa la URL de YouTube y los servidores dedicados de APUCORP pre-descargan, optimizan, comprimen y empaquetan el video en nuestra CDN para descarga offline instantánea de los guardias.
                          </p>
                          <p>
                            <strong>Cargar Archivo:</strong> Utilícelo únicamente si ya cuenta con el video físico de capacitación en su laptop y prefiere no depender de la conexión externa de YouTube durante el registro.
                          </p>
                        </div>

                        {/* Formulario condicional según método */}
                        {videoAttachMethod === "link" ? (
                          <div className={`p-4 rounded-xl border ${
                            darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                          } space-y-3`}>
                            <label className="block text-xs font-bold text-slate-500">Enlace de YouTube:</label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                placeholder="Ej: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                className={`flex-1 p-2.5 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all ${
                                  darkMode 
                                    ? "bg-slate-900 border-slate-850 text-white placeholder-slate-600" 
                                    : "bg-white border-slate-250 text-slate-800 placeholder-slate-400"
                                }`}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Soporta formatos estándar de YouTube (ej. watch?v= o url cortada youtu.be/).
                            </p>

                            {isSimulatingLinkProcessing && (
                              <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium flex items-center gap-2 animate-pulse">
                                <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                                Servidores de APUCORP descargando el video en segundo plano para empaquetamiento táctico...
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Youtube Downloader Video Attachment Section (File upload) */
                          <div className={`p-4 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all ${
                            attachedVideoName
                              ? (darkMode ? "bg-emerald-500/5 border-emerald-500/30" : "bg-emerald-50/30 border-emerald-300")
                              : (darkMode ? "bg-slate-950/60 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-indigo-200")
                          }`}>
                            
                            <input 
                              type="file"
                              id="youtube-video-attachment"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setAttachedVideoFile(file);
                                  setAttachedVideoName(file.name);
                                }
                              }}
                            />

                            {attachedVideoName ? (
                              <div className="text-center space-y-2">
                                <div className="mx-auto w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                                  <Check className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    ¡Video de YouTube Adjuntado Exitosamente!
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Archivo: {attachedVideoName} ({attachedVideoFile ? `${(attachedVideoFile.size / (1024 * 1024)).toFixed(1)} MB` : 'Youtube Local'})
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttachedVideoFile(null);
                                    setAttachedVideoName("");
                                  }}
                                  className="text-[10px] font-bold text-rose-500 hover:underline"
                                >
                                  Quitar o cambiar video
                                </button>
                              </div>
                            ) : (
                              <div className="text-center space-y-3 py-2">
                                <div className="flex justify-center gap-2">
                                  <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
                                    <Video className="w-5 h-5" />
                                  </div>
                                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                    <Upload className="w-5 h-5" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">Adjuntar video descargado de YouTube</p>
                                  <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">
                                    Haga clic abajo para adjuntar el archivo de video (.mp4, .mkv, etc.) que ha descargado de YouTube para esta capacitación.
                                  </p>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    document.getElementById("youtube-video-attachment")?.click();
                                  }}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-indigo-500/10 flex items-center gap-1.5 transition-all mx-auto"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  Adjuntar Video Descargado
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isSimulatingLinkProcessing}
                            className={`px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                              isSimulatingLinkProcessing ? "opacity-55 cursor-not-allowed" : ""
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Registrar Módulo de Capacitación
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Course AI Management Area */}
                    <div className={`p-6 rounded-2xl border ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                        <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                          <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Módulos y Creación de Cuestionarios con Inteligencia Artificial
                        </h2>
                        <p className="text-[11px] text-slate-500">
                          Seleccione un módulo para descargar el video y generar automáticamente las preguntas del examen con IA Gemini.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {coursesList.map((course) => {
                          const isActive = activeCourse.id === course.id;
                          return (
                            <div 
                              key={course.id} 
                              className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                                isActive 
                                  ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/10" 
                                  : (darkMode ? "bg-slate-950/40 border-slate-800 hover:border-slate-700" : "bg-slate-50/50 border-slate-200 hover:border-indigo-100")
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    isActive 
                                      ? "bg-indigo-600 text-white" 
                                      : (darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600")
                                  }`}>
                                    {isActive ? "Activo en App" : "Módulo Disponible"}
                                  </span>
                                  {course.preguntasGenerated ? (
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                      <Sparkles className="w-3 h-3" /> IA Lista
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 font-medium">Banco Estático</span>
                                  )}
                                </div>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">{course.titulo}</h4>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{course.descripcion}</p>
                              </div>

                              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                                {/* Download offline video button */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleDownloadVideo(course.id)}
                                    disabled={course.isDownloading || course.downloaded}
                                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 border ${
                                      course.downloaded 
                                        ? "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    {course.isDownloading ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                        <span>{course.downloadPercent}%</span>
                                      </>
                                    ) : course.downloaded ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Descargado (Local)</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Descargar Video</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Generate questions button with Gemini */}
                                  <button
                                    onClick={() => handleGenerateAiQuestions(course.id)}
                                    disabled={isGeneratingQuestionsId !== null}
                                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center gap-1 ${
                                      course.preguntasGenerated
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                        : "bg-indigo-50/60 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 animate-pulse"
                                    }`}
                                    title="Crear Preguntas del examen con Inteligencia Artificial Gemini"
                                  >
                                    {isGeneratingQuestionsId === course.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5" />
                                    )}
                                    <span>{course.preguntasGenerated ? "Regenerar IA" : "IA Crear Preguntas"}</span>
                                  </button>
                                </div>

                                {/* Collapsible Quiz/Questions Preview Section */}
                                <div className="space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => setShowQuestionsCourseId(showQuestionsCourseId === course.id ? null : course.id)}
                                    className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 border uppercase tracking-wider ${
                                      showQuestionsCourseId === course.id
                                        ? "bg-slate-200 dark:bg-slate-800 border-transparent text-slate-700 dark:text-slate-300"
                                        : "bg-indigo-500/5 dark:bg-indigo-500/10 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                    }`}
                                  >
                                    {showQuestionsCourseId === course.id ? (
                                      <>
                                        <EyeOff className="w-3.5 h-3.5" />
                                        Ocultar Cuestionario ({course.preguntas.length})
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-3.5 h-3.5" />
                                        Ver Cuestionario del Examen ({course.preguntas.length})
                                      </>
                                    )}
                                  </button>

                                  {showQuestionsCourseId === course.id && (
                                    <div className={`p-3 rounded-xl text-left text-xs space-y-3 border overflow-y-auto max-h-56 ${
                                      darkMode ? "bg-slate-950/85 border-slate-800" : "bg-slate-50 border-slate-250 shadow-inner"
                                    }`}>
                                      <div className="flex items-center justify-between border-b pb-1.5 border-slate-200 dark:border-slate-800">
                                        <span className="font-extrabold text-[9px] text-slate-500 uppercase tracking-wider">Banco de Preguntas Activo</span>
                                        <span className="text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Aprobación: 3/3</span>
                                      </div>
                                      {course.preguntas && course.preguntas.length > 0 ? (
                                        course.preguntas.map((p, index) => (
                                          <div key={p.id} className="space-y-1.5 border-b last:border-b-0 pb-2.5 last:pb-0 border-slate-200/55 dark:border-slate-800/80">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                              {index + 1}. {p.enunciado}
                                            </p>
                                            <div className="space-y-1 pl-1">
                                              {p.opciones.map((opcion, oIdx) => {
                                                const isCorrect = oIdx === p.correcta;
                                                return (
                                                  <div 
                                                    key={oIdx} 
                                                    className={`p-1.5 rounded text-[10px] leading-tight flex items-start gap-1.5 ${
                                                      isCorrect 
                                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20" 
                                                        : "text-slate-500 dark:text-slate-400"
                                                    }`}
                                                  >
                                                    <span className={`w-3.5 h-3.5 shrink-0 rounded-full flex items-center justify-center font-bold text-[8px] ${
                                                      isCorrect 
                                                        ? "bg-emerald-500 text-white" 
                                                        : (darkMode ? "bg-slate-800 text-slate-500" : "bg-slate-200 text-slate-600")
                                                    }`}>
                                                      {String.fromCharCode(65 + oIdx)}
                                                    </span>
                                                    <span>{opcion}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-[10px] text-slate-400 text-center py-2 italic">No hay preguntas registradas.</p>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Dispatch to agents app */}
                                <button
                                  onClick={() => handleDispatchCourse(course.id)}
                                  disabled={isActive}
                                  className={`w-full py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                                    isActive
                                      ? "bg-emerald-600 text-white shadow-sm"
                                      : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-extrabold"
                                  }`}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>{isActive ? "Distribuido a Agentes" : "Enviar a App del Agente"}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Simulation logs container */}
                    <div className={`p-5 rounded-2xl border ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                      <div className="flex items-center justify-between border-b pb-3 mb-3 border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Consola de Eventos y Sincronización Firestore
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                          Canal en Tiempo Real (WebSockets / Snapshots)
                        </span>
                      </div>
                      <div className="bg-slate-950 text-indigo-300 font-mono text-xs rounded-xl p-4.5 h-44 overflow-y-auto border border-slate-800 flex flex-col gap-2 shadow-inner">
                        {simulationLog.map((log, idx) => (
                          <div 
                            key={idx} 
                            className={`pb-1.5 border-b border-slate-900/40 leading-relaxed text-[11px] ${
                              log.includes("⚠️") ? "text-amber-400 font-bold" : log.includes("❌") ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reports overview table */}
                    <div className={`p-6 rounded-2xl border ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
                        <div>
                          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            Reportes de Agentes en Tiempo Real
                          </h2>
                          <p className="text-xs text-slate-500 mt-1">
                            Monitoreo inmediato de los agentes, su estado de capacitación y calificaciones enviadas.
                          </p>
                        </div>
                      </div>

                      {/* Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unidad / Sede:</label>
                          <select
                            value={adminFilterSede}
                            onChange={(e) => setAdminFilterSede(e.target.value)}
                            className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                              darkMode 
                                ? "bg-slate-950 border-slate-800 text-white" 
                                : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                          >
                            <option value="Todas">Todas las Sedes</option>
                            <option value="Norte">Sede Norte (Refinería)</option>
                            <option value="Sur">Sede Sur (Minería)</option>
                            <option value="Centro">Sede Centro (Oficinas)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estado de Capacitación:</label>
                          <select
                            value={adminFilterEstado}
                            onChange={(e) => setAdminFilterEstado(e.target.value)}
                            className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                              darkMode 
                                ? "bg-slate-950 border-slate-800 text-white" 
                                : "bg-slate-50 border-slate-200 text-slate-800"
                            }`}
                          >
                            <option value="Todos">Todos los Estados</option>
                            <option value="Aprobado">Aprobado</option>
                            <option value="Pendiente">Pendiente</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              setAdminFilterSede("Todas");
                              setAdminFilterEstado("Todos");
                            }}
                            className={`w-full py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              darkMode 
                                ? "border-slate-800 hover:bg-slate-800 text-slate-300" 
                                : "border-slate-200 hover:bg-slate-50 text-slate-700 bg-white"
                            }`}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Restablecer Filtros
                          </button>
                        </div>
                      </div>

                      {/* Agentes Table */}
                      <div className={`overflow-x-auto rounded-xl border ${
                        darkMode ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-white"
                      }`}>
                        <table className="w-full text-left border-collapse">
                          <thead className={`text-[10px] font-bold uppercase tracking-wider border-b ${
                            darkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}>
                            <tr>
                              <th className="px-6 py-4">Agente / Correo</th>
                              <th className="px-6 py-4">DNI / Celular</th>
                              <th className="px-6 py-4">Sede / Puesto</th>
                              <th className="px-6 py-4 text-center">Último Puntaje</th>
                              <th className="px-6 py-4">Fecha de Intento</th>
                              <th className="px-6 py-4 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
                            {filteredAgentes.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-400 italic">
                                  No se encontraron agentes con los filtros seleccionados.
                                </td>
                              </tr>
                            ) : (
                              filteredAgentes.map(agente => (
                                <tr key={agente.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className={`font-semibold text-xs ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{agente.nombre}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{agente.correo}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-mono text-slate-400">{agente.dni}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">{agente.celular}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-medium">{agente.sede}</div>
                                    <div className="text-[10px] text-slate-400">{agente.puesto}</div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`font-mono font-bold text-xs ${agente.puntaje > 10 ? "text-emerald-500" : "text-rose-500"}`}>
                                      {agente.puntaje === 0 && agente.fecha === "No registra intentos" ? "--" : `${agente.puntaje} / 20`}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">{agente.fecha}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex justify-center">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        agente.estado === "Aprobado"
                                          ? "bg-emerald-500/15 text-emerald-500"
                                          : "bg-amber-500/15 text-amber-500"
                                      }`}>
                                        {agente.estado}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </div>
          </main>

        </div>
      )}

      {/* Modal - Register New Agent */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl border shadow-2xl max-w-md w-full overflow-hidden transition-all duration-300 ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}>
              <h3 className="font-bold text-sm">Registrar Nuevo Agente en Firestore</h3>
              <button 
                type="button"
                onClick={() => setShowAddAgentModal(false)}
                className="text-slate-400 hover:text-slate-200 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddAgent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo: *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Juan Alberto Pérez"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                    darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-850"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Correo Electrónico (Login ID): *</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@seguro.com"
                  value={newAgentEmail}
                  onChange={(e) => setNewAgentEmail(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                    darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-850"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">DNI: *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="8 dígitos"
                    value={newAgentDni}
                    onChange={(e) => setNewAgentDni(e.target.value)}
                    className={`w-full p-2 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                      darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-850"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Celular:</label>
                  <input
                    type="text"
                    maxLength={9}
                    placeholder="9 dígitos"
                    value={newAgentCelular}
                    onChange={(e) => setNewAgentCelular(e.target.value)}
                    className={`w-full p-2 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                      darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-850"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Sede / Unidad asignada:</label>
                <select
                  value={newAgentSede}
                  onChange={(e) => setNewAgentSede(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                    darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-850"
                  }`}
                >
                  <option value="Sede Norte (Refinería)">Sede Norte (Refinería)</option>
                  <option value="Sede Sur (Minería)">Sede Sur (Minería)</option>
                  <option value="Sede Centro (Oficinas)">Sede Centro (Oficinas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Puesto de Servicio:</label>
                <input
                  type="text"
                  placeholder="Ej. Vigilante CCTV, Supervisor"
                  value={newAgentPuesto}
                  onChange={(e) => setNewAgentPuesto(e.target.value)}
                  className={`w-full p-2 border rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                    darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-850"
                  }`}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Registrar en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/* INDEPENDENT PORTABLE AGENT COMPONENT FOR FLEXIBLE PREVIEW LAYOUTS */
interface AgentContentProps {
  currentUser: LoggedInUser | null;
  activeCourse: Course;
  coursesList: Course[];
  videoProgress: number;
  isVideoFinished: boolean;
  isTestStarted: boolean;
  currentQuestionIndex: number;
  selectedAnswers: Record<string, number>;
  testResult: { score: number; passed: boolean } | null;
  setIsTestStarted: (v: boolean) => void;
  setCurrentQuestionIndex: (f: any) => void;
  handleSimulateWatchVideo: () => void;
  handleSelectAnswer: (id: string, idx: number) => void;
  handleSubmitTest: () => void;
  handleResetTest: () => void;
  darkMode: boolean;
}

function AgentContent({
  currentUser,
  activeCourse,
  coursesList,
  videoProgress,
  isVideoFinished,
  isTestStarted,
  currentQuestionIndex,
  selectedAnswers,
  testResult,
  setIsTestStarted,
  setCurrentQuestionIndex,
  handleSimulateWatchVideo,
  handleSelectAnswer,
  handleSubmitTest,
  handleResetTest,
  darkMode
}: AgentContentProps) {
  
  return (
    <div className="space-y-4">
      {/* Current Agent Header Info */}
      <div className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${
        darkMode ? "bg-slate-900/60 border-slate-850" : "bg-white border-slate-200"
      }`}>
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {currentUser?.nombre ? currentUser.nombre.substring(0, 2) : "AG"}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-xs truncate">{currentUser?.nombre || "Agente"}</h4>
            <p className="text-[10px] text-slate-400 font-mono truncate">{currentUser?.email || "correo@empresa.com"}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1.5 pt-2 border-t border-slate-100 dark:border-slate-850/60 text-[10px] font-mono text-slate-400">
          <div>Sede: <strong className="text-indigo-500">{currentUser?.sede || "No asignada"}</strong></div>
          <div>Puesto: <strong className="text-slate-300">{currentUser?.puesto || "No asignado"}</strong></div>
        </div>
      </div>

      {/* Course Video Player */}
      <div className={`p-4.5 rounded-xl border ${
        darkMode ? "bg-slate-900 border-slate-850" : "bg-white border-slate-200 shadow-xs"
      }`}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
            Video de Capacitación Obligatorio:
          </span>
          <span className="px-1.5 py-0.5 bg-red-600 rounded text-[9px] font-bold uppercase text-white animate-pulse">
            Bloqueado 🔒
          </span>
        </div>

        {/* Video simulation box */}
        <div className="bg-slate-950 aspect-video rounded-xl overflow-hidden relative flex flex-col justify-between p-3.5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[8px] bg-red-600 px-1 py-0.5 rounded font-black tracking-wider uppercase">
              REPRODUCCIÓN
            </span>
            <span className="text-[9px] text-indigo-400 font-extrabold truncate max-w-[150px]">
              {activeCourse.titulo}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center py-4 text-center">
            {videoProgress === 0 ? (
              <button
                onClick={handleSimulateWatchVideo}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all shadow-md flex items-center justify-center"
              >
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </button>
            ) : videoProgress < 100 ? (
              <div className="flex flex-col items-center gap-2 w-full px-4">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-[10px] font-bold font-mono text-slate-300">
                  Reproduciendo: {videoProgress}%
                </span>
                <p className="text-[9px] text-slate-500 leading-tight">
                  No cierre la ventana. La barra está bloqueada para evitar saltos.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-emerald-400 mt-1">¡Capacitación completada!</span>
                <p className="text-[9px] text-slate-400">Ahora puede proceder al examen táctico.</p>
              </div>
            )}
          </div>

          {/* Locked Progress bar */}
          <div className="space-y-1 mt-1">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden relative">
              <div 
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${videoProgress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>{Math.round((videoProgress / 100) * 12)}:00 min</span>
              <span>12:00 min</span>
            </div>
          </div>
        </div>

        {/* Action Button: Start Evaluation */}
        <div className="mt-4">
          {!isTestStarted && (
            <button
              onClick={() => setIsTestStarted(true)}
              disabled={!isVideoFinished}
              className={`w-full py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                isVideoFinished 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer animate-pulse" 
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Iniciar Evaluación Obligatoria
            </button>
          )}
        </div>
      </div>

      {/* Evaluation Questions / Exam Area */}
      {isTestStarted && (
        <div className={`p-4 rounded-xl border transition-all ${
          darkMode ? "bg-slate-900 border-slate-850" : "bg-white border-slate-200 shadow-xs"
        }`}>
          <div className="border-b pb-2 mb-3 border-slate-100 dark:border-slate-850/60 flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
            <span>Evaluación Final de Seguridad</span>
            <span className="text-indigo-500">Módulo Activo</span>
          </div>

          {testResult === null ? (
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-3">
                <span className="font-mono text-[10px] text-slate-400">
                  Pregunta {currentQuestionIndex + 1} de {activeCourse.preguntas.length}
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-mono text-[9px]">
                  +2.0 pts
                </span>
              </div>

              {/* Question text */}
              <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-relaxed mb-4">
                {activeCourse.preguntas[currentQuestionIndex].enunciado}
              </h4>

              {/* Options */}
              <div className="space-y-2">
                {activeCourse.preguntas[currentQuestionIndex].opciones.map((op, idx) => {
                  const isSelected = selectedAnswers[activeCourse.preguntas[currentQuestionIndex].id] === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectAnswer(activeCourse.preguntas[currentQuestionIndex].id, idx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs font-medium leading-relaxed transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "border-slate-400 text-slate-500"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{op}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation within test */}
              <div className="flex justify-between items-center mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold disabled:opacity-40"
                >
                  Anterior
                </button>
                
                {currentQuestionIndex < activeCourse.preguntas.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-4.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitTest}
                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold shadow-sm animate-pulse"
                  >
                    Enviar Examen
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* TEST COMPLETED / GRADE PANEL */
            <div className={`p-5 rounded-xl text-center flex flex-col items-center justify-center min-h-[200px] ${
              testResult.passed 
                ? "bg-emerald-500/10 border border-emerald-500/20" 
                : "bg-rose-500/10 border border-rose-500/20"
            }`}>
              {testResult.passed ? (
                <>
                  <div className="w-11 h-11 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-3.5 shadow-sm">
                    <CheckCircle className="w-5.5 h-5.5" />
                  </div>
                  <h4 className="font-extrabold text-xs text-emerald-500 uppercase tracking-widest">Capacitación Aprobada</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Obtuvo una calificación oficial de <strong className="text-emerald-500 font-bold font-mono text-base">{testResult.score} / 20</strong>. Su progreso ha sido cargado con éxito en Firestore.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-11 h-11 bg-rose-500 text-white rounded-full flex items-center justify-center mb-3.5 shadow-xs">
                    <AlertTriangle className="w-5.5 h-5.5" />
                  </div>
                  <h4 className="font-extrabold text-xs text-rose-500 uppercase tracking-widest">Capacitación Pendiente</h4>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Puntaje obtenido: <strong className="text-rose-500 font-bold font-mono text-base">{testResult.score} / 20</strong>. Se requiere un mínimo de 11/20. Para rendir de nuevo, repita la capacitación visualizando el video completo.
                  </p>
                </>
              )}
              
              <button
                type="button"
                onClick={handleResetTest}
                className="mt-4 px-4.5 py-1.5 bg-slate-900 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
