// Funções de máscara para padrões brasileiros
import {
  maskCPF,
  maskRG,
  maskEmail,
  maskCelular,
  maskTelefone,
  maskNIT,
  maskCTPS,
} from "../../../lib/masks/masks";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
  const selectFields = [
    {
      name: "estadoCivil",
      label: "Estado civil",
      options: [
        "Solteira",
        "Casada",
        "Divorciada",
        "Viúva",
        "Separada",
        "União estável",
      ],
    },
    {
      name: "situacaoBeneficio",
      label: "Situação do benefício",
      options: [
        "Benefício concluído",
        "Em andamento",
        "Aguardando documentação",
        "Aguardando INSS",
        "Negado",
        "Cancelado",
      ],
    },
    {
      name: "beneficioPretendido",
      label: "Benefício pretendido",
      options: [
        "Aposentadoria por tempo de contribuição do professor",
        "Aposentadoria por idade",
        "Aposentadoria por invalidez",
        "Aposentadoria especial",
        "Pensão por morte",
        "Auxílio-doença",
        "Auxílio-acidente",
        "Salário-maternidade",
      ],
    },
  ];
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

  // Arrays de opções para selects
  const selectFields = [
    {
      name: "estadoCivil",
      label: "Estado civil",
      options: [
        "Solteira",
        "Casada",
                      <Input
                        label="Nome da mãe"
                        placeholder="Digite o nome da mãe"
                        variant="flat"
                        size="lg"
                        classNames={{ label: "!text-secondary" }}
                        radius="md"
                        value={form.nomeMae}
                        onChange={(e) => handleFieldChange("nomeMae", e.target.value)}
                        className="min-w-[180px]"
                        isInvalid={!!errors.nomeMae}
                        errorMessage={errors.nomeMae || undefined}
                      />
                      {selectFields
                        .filter((f) => f.name === "beneficioPretendido")
                        .map((field) => {
                          return (
                            <Select
                              key={field.name}
                              className="min-w-80"
                              label={field.label}
                              size="lg"
                              variant="flat"
                              radius="md"
                              selectedKeys={form[field.name] ? [form[field.name]] : []}
                              onSelectionChange={(keys) => {
                                const value = String(Array.from(keys)[0] ?? "");
                                handleFieldChange(field.name, value);
                              }}
                              classNames={{ label: "!text-secondary" }}
                            >
                              {field.options.map((opt: string) => (
                                <SelectItem key={opt}>{opt}</SelectItem>
                              ))}
                            </Select>
                          );
                        })}
      nascimento: validateRequired(form.nascimento, "Data de nascimento") || validateDate(form.nascimento),
      estadoCivil: validateRequired(form.estadoCivil, "Estado civil"),
      cpf: validateRequired(form.cpf, "CPF") || validateCPF(form.cpf),
      rg: validateRequired(form.rg, "RG") || validateRG(form.rg),
      nomeMae: validateRequired(form.nomeMae, "Nome da mãe"),
      email: validateRequired(form.email, "E-mail") || validateEmail(form.email),
      celular: validateRequired(form.celular, "Celular") || validatePhone(form.celular),
      telRecado: validateRequired(form.telRecado, "Telefone recado") || validatePhone(form.telRecado),
      responsavelRecado: validateRequired(form.responsavelRecado, "Responsável"),
      situacaoBeneficio: validateRequired(form.situacaoBeneficio, "Situação do benefício"),
      beneficioPretendido: validateRequired(form.beneficioPretendido, "Benefício pretendido"),
      numBeneficiario: validateRequired(form.numBeneficiario, "Nº do beneficiário"),
      nitPis: validateRequired(form.nitPis, "NIT/PIS") || validateNIT(form.nitPis),
      profissao: validateRequired(form.profissao, "Profissão"),
      ctps: validateRequired(form.ctps, "CTPS") || validateCTPS(form.ctps),
      serie: validateRequired(form.serie, "Série"),
      senhaInss: validateRequired(form.senhaInss, "Senha INSS"),
      tempoContribuicao: validateRequired(form.tempoContribuicao, "Tempo de contribuição"),
      isento: validateSwitch(isento, "Isento do serviço"),
    };
  }

  // Checa se o formulário está válido
  const isFormValid = () => {
    return Object.values(errors).every((v) => !v);
  } 

  // Real-time field validation handler
  const handleFieldChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((prev) => {
      const validation = validateAllFields();
      return { ...prev, [field]: validation[field] };
    });
  };

  // Real-time switch validation handler
  const handleSwitchChange = (value: boolean) => {
    setIsento(value);
    setErrors((prev) => {
      const validation = validateAllFields();
      return { ...prev, isento: validation.isento };
    });
  };

  // Handler para envio futuro
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateAllFields();
    setErrors(validation);
    if (Object.values(validation).every((v) => !v)) {
      // Monta o body para envio
      const body = { ...form, isento };
      // Exibe no console
      console.log("Body para envio:", body);
      if (onConfirm) onConfirm();
      onClose();
    }
  }

  return (
    <Modal
      size="5xl"
      backdrop="blur"
      isOpen={isOpen}
      onClose={onClose}
      hideCloseButton={false}
      className="bg-[#F4F4F5] min-h-[80vh] max-w-[1440px]"
    >
      <ModalContent>
        {() => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="relative mt-6">
              <div className="flex flex-col p-10 h-28 w-full bg-primary rounded-2xl gap-4">
                <div className="flex items-center justify-between w-full">
                  <h1 className="text-4xl text-white">Cadastro de cliente</h1>
                </div>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="flex gap-4">
                <div className="grid grid-rows-2 gap-2 w-full">
                  <div className="bg-white flex flex-col rounded-2xl">
                    <div className="flex items-center gap-2 p-4">
                      <Image
                        src="../svg/icons/profile.svg"
                        alt="Logo"
                        height={24}
                        width={24}
                      />
                      <h3 className="text-xl font-semibold text-secondary">
                        Dados pessoais
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-4 px-4 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 w-full mb-4">
                        <Input
                          label="Nome completo"
                          placeholder="Digite o nome completo"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.nome}
                          onChange={(e) => handleFieldChange("nome", e.target.value)}
                          className="min-w-[180px]"
                          isInvalid={!!errors.nome}
                          errorMessage={errors.nome || undefined}
                        />
                        <Input
                          label="Data de nascimento"
                          placeholder="dd/mm/aaaa"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.nascimento}
                          onChange={(e) => handleFieldChange("nascimento", e.target.value)}
                          className="min-w-[125px]"
                          type="date"
                          isInvalid={!!errors.nascimento}
                          errorMessage={errors.nascimento || undefined}
                        />
                        {selectFields
                          .filter((f) => f.name === "estadoCivil")
                          .map((field) => {
                            return (
                              <Select
                                key={field.name}
                                label={field.label}
                                size="lg"
                                variant="flat"
                                radius="md"
                                selectedKeys={form[field.name] ? [form[field.name]] : []}
                                onSelectionChange={(keys) => {
                                  const value = String(Array.from(keys)[0] ?? "");
                                  handleFieldChange(field.name, value);
                                }}
                                classNames={{ label: "!text-secondary" }}
                                className="min-w-[180px]"
                              >
                                {field.options.map((opt: string) => (
                                  <SelectItem key={opt}>{opt}</SelectItem>
                                ))}
                              </Select>
                            );
                          })}
                        <Input
                          label="CPF"
                          placeholder="Digite o CPF"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.cpf}
                          onChange={(e) => handleFieldChange("cpf", maskCPF(e.target.value))}
                          className="min-w-[140px]"
                          isInvalid={!!errors.cpf}
                          errorMessage={errors.cpf || undefined}
                        />
                        <Input
                          label="RG"
                          placeholder="Digite o RG"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.rg}
                          onChange={(e) => handleFieldChange("rg", maskRG(e.target.value))}
                          className="min-w-[180px]"
                          isInvalid={!!errors.rg}
                          errorMessage={errors.rg || undefined}
                        />
                        <Input
                          label="Nome da mãe"
                          placeholder="Digite o nome da mãe"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.nomeMae}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, nomeMae: e.target.value }))
                          }
                          className="min-w-[180px]"
                          isInvalid={!!errors.nomeMae}
                          errorMessage={errors.nomeMae || undefined}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 w-full">
                        <Input
                          label="E-mail"
                          placeholder="Digite o e-mail"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.email}
                          onChange={(e) => handleFieldChange("email", maskEmail(e.target.value))}
                          className="min-w-[180px]"
                          isInvalid={!!errors.email}
                          errorMessage={errors.email || undefined}
                        />
                        <Input
                          label="Celular"
                          placeholder="Digite o celular"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.celular}
                          onChange={(e) => handleFieldChange("celular", maskCelular(e.target.value))}
                          className="min-w-[140px]"
                          isInvalid={!!errors.celular}
                          errorMessage={errors.celular || undefined}
                        />
                        <Input
                          label="Telefone recado"
                          placeholder="Digite o telefone de recado"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.telRecado}
                          onChange={(e) => handleFieldChange("telRecado", maskTelefone(e.target.value))}
                          className="min-w-[140px]"
                          isInvalid={!!errors.telRecado}
                          errorMessage={errors.telRecado || undefined}
                        />
                        <Input
                          label="Responsável"
                          placeholder="Digite o responsável pelo recado"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.responsavelRecado}
                          onChange={(e) => handleFieldChange("responsavelRecado", e.target.value)}
                          className="min-w-[100px]"
                          isInvalid={!!errors.responsavelRecado}
                          errorMessage={errors.responsavelRecado || undefined}
                        />
                        {selectFields
                          .filter((f) => f.name === "situacaoBeneficio")
                          .map((field) => {
                            return (
                              <Select
                                key={field.name}
                                label={field.label}
                                size="lg"
                                variant="flat"
                                radius="md"
                                selectedKeys={form[field.name] ? [form[field.name]] : []}
                                onSelectionChange={(keys) => {
                                  const value = String(Array.from(keys)[0] ?? "");
                                  handleFieldChange(field.name, value);
                                }}
                                classNames={{ label: "!text-secondary" }}
                                className="min-w-[240px]"
                              >
                                {field.options.map((opt: string) => (
                                  <SelectItem key={opt}>{opt}</SelectItem>
                                ))}
                              </Select>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white flex flex-col rounded-2xl">
                    <div className="flex items-center gap-2 p-4">
                      <Image
                        src="../svg/icons/user_id.svg"
                        alt="Logo"
                        height={24}
                        width={24}
                      />
                      <h3 className="text-xl font-semibold text-secondary">
                        Dados profissionais
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-4 p-4 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                        {/* Profissional section grid - only keep this one */}
                        {selectFields
                          .filter((f) => f.name === "beneficioPretendido")
                          .map((field) => (
                            <Select
                              key={field.name}
                              className="min-w-80"
                              label={field.label}
                              size="lg"
                              variant="flat"
                              radius="md"
                              selectedKeys={form[field.name] ? [form[field.name]] : []}
                              onSelectionChange={(keys) => {
                                const value = String(Array.from(keys)[0] ?? "");
                                handleFieldChange(field.name, value);
                              }}
                              classNames={{ label: "!text-secondary" }}
                            >
                              {field.options.map((opt: string) => (
                                <SelectItem key={opt}>{opt}</SelectItem>
                              ))}
                            </Select>
                          ))}
                        <Input
                          label="Nº do beneficiário"
                          placeholder="Digite o número do beneficiário"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.numBeneficiario}
                          onChange={(e) => handleFieldChange("numBeneficiario", e.target.value)}
                          className="min-w-[180px]"
                          isInvalid={!!errors.numBeneficiario}
                          errorMessage={errors.numBeneficiario || undefined}
                        />
                        <Input
                          label="NIT/PIS"
                          placeholder="Digite o NIT/PIS"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.nitPis}
                          onChange={(e) => handleFieldChange("nitPis", maskNIT(e.target.value))}
                          className="min-w-[180px]"
                          isInvalid={!!errors.nitPis}
                          errorMessage={errors.nitPis || undefined}
                        />
                        <Input
                          label="Profissão"
                          placeholder="Digite a profissão"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.profissao}
                          onChange={(e) => handleFieldChange("profissao", e.target.value)}
                          className="min-w-[180px]"
                          isInvalid={!!errors.profissao}
                          errorMessage={errors.profissao || undefined}
                        />
                        <Input
                          label="CTPS"
                          placeholder="Digite o número da CTPS"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.ctps}
                          onChange={(e) => handleFieldChange("ctps", maskCTPS(e.target.value))}
                          className="min-w-[180px]"
                          isInvalid={!!errors.ctps}
                          errorMessage={errors.ctps || undefined}
                        />
                        <Input
                          label="Série"
                          placeholder="Digite a série da CTPS"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.serie}
                          onChange={(e) => handleFieldChange("serie", e.target.value)}
                          className="min-w-[180px]"
                          isInvalid={!!errors.serie}
                          errorMessage={errors.serie || undefined}
                        />
                        <Input
                          label='Senha "meu inss"'
                          placeholder="Digite a senha do INSS"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          type="text"
                          value={form.senhaInss}
                          onChange={(e) => handleFieldChange("senhaInss", e.target.value)}
                          className="min-w-[180px]"
                          isInvalid={!!errors.senhaInss}
                          errorMessage={errors.senhaInss || undefined}
                        />
                        <Input
                          label="Tempo de contribuição"
                          placeholder="Digite o tempo de contribuição"
                          variant="flat"
                          size="lg"
                          classNames={{ label: "!text-secondary" }}
                          radius="md"
                          value={form.tempoContribuicao}
                          onChange={(e) => handleFieldChange("tempoContribuicao", e.target.value)}
                          className="min-w-[180px]"
                          isInvalid={!!errors.tempoContribuicao}
                          errorMessage={errors.tempoContribuicao || undefined}
                        />
                      </div>
                    </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
            <div className="flex flex-col gap-5 pb-6 px-6">
              <div className="flex flex-col gap-4 items-end mt-4">
                <p className="text-primary font-medium">Cliente isento do serviço?</p>
                <div className="flex gap-3 items-center">
                  <p className="text-gray-500 gap-1">Não</p>
                  <Switch
                    size="md"
                    color={isento ? "success" : "default"}
                    className={isento ? "text-success" : "text-gray-500"}
                    classNames={{ label: isento ? "!text-success" : "!text-gray-500" }}
                    isSelected={isento}
                    onValueChange={handleSwitchChange}
                  >
                    Sim
                  </Switch>
                </div>
                {!!errors.isento && (
                  <span className="text-xs text-danger mt-1">{errors.isento}</span>
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  size="md"
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg"
                  onPress={onClose}
                  type="button"
                >
                  Cancelar
                </Button>
                <Button
                  size="md"
                  type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-lg"
                  isDisabled={!isFormValid()}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
