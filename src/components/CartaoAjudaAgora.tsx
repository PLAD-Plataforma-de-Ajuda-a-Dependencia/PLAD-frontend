import RecursosDeCrise from './RecursosDeCrise'

/**
 * Os mesmos recursos de crise do botão "Precisa de ajuda agora?" (AjudaAgora), como cartão na página. Fica no fim da
 * triagem: quem acabou de contar como está pode precisar deles na hora. Só informação, sem chamada à API.
 */
export default function CartaoAjudaAgora() {
    return (
        <section
            aria-labelledby="ajuda-agora-cartao"
            className="w-full space-y-4 rounded-cartao border border-borda-suave bg-plad-fundo p-5 text-left"
        >
            <div>
                <h2 id="ajuda-agora-cartao" className="font-outfit text-lg font-semibold text-black">
                    Precisa de ajuda agora?
                </h2>
                <p className="mt-1 text-sm text-texto-suave">
                    Se hoje está pesado, você não precisa esperar por uma reunião. Estes serviços atendem agora.
                </p>
            </div>
            <RecursosDeCrise />
        </section>
    )
}
