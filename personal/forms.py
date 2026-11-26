from django import forms

from .models import Empleado


class EmpleadoForm(forms.ModelForm):
    class Meta:
        model = Empleado
        fields = ["nombre"]

    def clean_nombre(self):
        nombre = self.cleaned_data["nombre"].strip()
        repetido = Empleado.objects.filter(nombre__iexact=nombre).exclude(pk=self.instance.pk)
        if repetido.exists():
            raise forms.ValidationError("Ya existe un empleado con ese nombre.")
        return nombre
