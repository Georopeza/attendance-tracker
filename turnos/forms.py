from datetime import date

from django import forms

from .models import DIAS_SEMANA, ExcepcionTurno, Turno


class TurnoForm(forms.ModelForm):
    dias = forms.MultipleChoiceField(choices=DIAS_SEMANA, widget=forms.CheckboxSelectMultiple,
                                     label="Días en que rige")
    inicio = forms.TimeField(widget=forms.TimeInput(attrs={"type": "time"}), label="Inicio")
    fin = forms.TimeField(widget=forms.TimeInput(attrs={"type": "time"}), label="Fin")

    class Meta:
        model = Turno
        fields = ["nombre", "inicio", "fin", "dias"]

    def clean_dias(self):
        return sorted(int(d) for d in self.cleaned_data["dias"])

    def clean(self):
        datos = super().clean()
        if datos.get("inicio") and datos.get("fin") and datos["fin"] <= datos["inicio"]:
            raise forms.ValidationError("El fin del turno debe ser posterior al inicio.")
        return datos


class CambioHorarioForm(forms.Form):
    """Cambiar el horario de un turno desde una fecha, sin alterar el pasado."""

    inicio = forms.TimeField(widget=forms.TimeInput(attrs={"type": "time"}), label="Nuevo inicio")
    fin = forms.TimeField(widget=forms.TimeInput(attrs={"type": "time"}), label="Nuevo fin")
    desde = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}), label="Rige desde",
                            initial=date.today)

    def clean(self):
        datos = super().clean()
        if datos.get("inicio") and datos.get("fin") and datos["fin"] <= datos["inicio"]:
            raise forms.ValidationError("El fin del turno debe ser posterior al inicio.")
        return datos


class ExcepcionForm(forms.ModelForm):
    fecha = forms.DateField(widget=forms.DateInput(attrs={"type": "date"}))
    inicio = forms.TimeField(required=False, widget=forms.TimeInput(attrs={"type": "time"}),
                             label="Inicio ese día", help_text="Vacío = el del turno.")
    fin = forms.TimeField(required=False, widget=forms.TimeInput(attrs={"type": "time"}),
                          label="Fin ese día", help_text="Vacío = el del turno.")

    class Meta:
        model = ExcepcionTurno
        fields = ["fecha", "turno", "inicio", "fin"]
        labels = {"turno": "Turno ese día (vacío = ese día no hay turno)"}
