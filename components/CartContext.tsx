'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface CartItemLoteria {
  tipo: 'loteria'
  bolaoSlug: string
  bolaoNome: string
  loteria: string
  concurso: number
  cotas: string[]
  valorCota: number
  total: number
}

export interface CartItemEsporte {
  tipo: 'esporte'
  bolaoSlug: string
  bolaoNome: string
  palpites: { jogo_id: string; gol_casa: number; gol_fora: number; timeCasa?: string; timeFora?: string }[]
  chavePix: string
  total: number
}

export type CartItem = CartItemLoteria | CartItemEsporte

interface CartContextValue {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (index: number) => void
  clear: () => void
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'bolao_carrinho'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hidratado, setHidratado] = useState(false)

  // Carrega o carrinho salvo uma única vez, no mount
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY)
      if (salvo) setItems(JSON.parse(salvo))
    } catch {}
    setHidratado(true)
  }, [])

  // Persiste a cada mudança (só depois de hidratar, pra não sobrescrever com [])
  useEffect(() => {
    if (!hidratado) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hidratado])

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => [...prev, item])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const total = items.reduce((s, it) => s + it.total, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>')
  return ctx
}
