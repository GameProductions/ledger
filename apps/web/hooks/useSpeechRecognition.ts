import { useState, useRef, useCallback, useEffect } from 'react'

type Status = 'idle' | 'listening' | 'error'

interface SpeechResult {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  start: () => void
  stop: () => void
}

export function useSpeechRecognition(): SpeechResult {
  const [status, setStatus] = useState<Status>('idle')
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  const isSupported = typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      if (final) setTranscript(prev => (prev ? prev + ' ' : '') + final)
      setInterimTranscript(interim)
    }

    recognition.onerror = () => {
      setStatus('error')
    }

    recognition.onend = () => {
      setStatus('idle')
    }

    recognitionRef.current = recognition

    return () => {
      try { recognition.abort() } catch {}
    }
  }, [isSupported])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript('')
    setInterimTranscript('')
    setStatus('listening')
    try { recognitionRef.current.start() } catch { setStatus('error') }
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    try { recognitionRef.current.stop() } catch {}
    setStatus('idle')
  }, [])

  return {
    transcript,
    interimTranscript,
    isListening: status === 'listening',
    isSupported,
    start,
    stop,
  }
}
